import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun.relay.metered.ca:80',
      ],
    },
    {
      urls: [
        'turn:global.relay.metered.ca:80',
        'turn:global.relay.metered.ca:80?transport=tcp',
        'turn:global.relay.metered.ca:443',
        'turns:global.relay.metered.ca:443?transport=tcp',
      ],
      username: 'c7298eee53f79927ea68d73a',
      credential: 'Q6koKzbCjVLQ/Z34',
    },
  ],
};

type SessionDescriptionJSON = { type: RTCSdpType; sdp: string; sessionId: string };

interface RtcSignalDoc {
  viewerUid: string;
  offer?: SessionDescriptionJSON;
  answer?: SessionDescriptionJSON;
  hostCandidates?: string[];
  viewerCandidates?: string[];
}

const signalDoc = (roomId: string, colName: string, docId: string) =>
  doc(db, 'liveRooms', roomId, colName, docId);

function serializeCandidate(candidate: RTCIceCandidate): string {
  return JSON.stringify(candidate.toJSON());
}

// Publisher: one RTCPeerConnection per viewer. `docIdToViewer` maps a signaling
// doc id to the viewer uid it belongs to (null = not this publisher's doc).
function startPublisherBroadcast(
  roomId: string,
  colName: string,
  docIdToViewer: (docId: string) => string | null,
  stream: MediaStream,
  onPeers?: (count: number) => void
): () => void {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const peers = new Map<string, { pc: RTCPeerConnection; unsub: () => void }>();
  let stopped = false;

  const closePeer = (viewerUid: string) => {
    const entry = peers.get(viewerUid);
    if (!entry) return;
    entry.unsub();
    entry.pc.close();
    peers.delete(viewerUid);
    onPeers?.(peers.size);
  };

  const attachViewer = (docId: string, viewerUid: string) => {
    if (stopped || peers.has(viewerUid)) return;
    const ref = signalDoc(roomId, colName, docId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      updateDoc(ref, {
        hostCandidates: arrayUnion(serializeCandidate(event.candidate)),
      }).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (stopped) return;
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(viewerUid);
      }
    };

    let offered = false;
    let appliedViewerCandidates = 0;

    const unsub = onSnapshot(ref, async (snap) => {
      const data = snap.data() as RtcSignalDoc | undefined;
      if (!data || stopped) return;
      try {
        if (!offered) {
          offered = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateDoc(ref, {
            offer: { type: offer.type, sdp: offer.sdp ?? '', sessionId },
          });
        }
        if (
          data.answer?.sessionId === sessionId &&
          pc.signalingState === 'have-local-offer'
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: data.answer.type, sdp: data.answer.sdp })
          );
        }
        if (pc.remoteDescription) {
          const candidates = data.viewerCandidates ?? [];
          for (let i = appliedViewerCandidates; i < candidates.length; i++) {
            appliedViewerCandidates++;
            await pc
              .addIceCandidate(new RTCIceCandidate(JSON.parse(candidates[i])))
              .catch(() => {});
          }
        }
      } catch {
        // Signaling races are recoverable on the next snapshot
      }
    });

    peers.set(viewerUid, { pc, unsub });
    onPeers?.(peers.size);
  };

  const unsubCollection = onSnapshot(
    collection(db, 'liveRooms', roomId, colName),
    (snap) => {
      snap.docChanges().forEach((change) => {
        const viewerUid = docIdToViewer(change.doc.id);
        if (!viewerUid) return;
        if (change.type === 'removed') {
          closePeer(viewerUid);
        } else {
          attachViewer(change.doc.id, viewerUid);
        }
      });
    }
  );

  return () => {
    stopped = true;
    unsubCollection();
    peers.forEach((_, viewerUid) => closePeer(viewerUid));
  };
}

export type ViewerStreamState = 'connecting' | 'live' | 'ended';

// Viewer: receive one publisher's stream over WebRTC from a signaling doc.
function joinPublisherStream(
  roomId: string,
  colName: string,
  docId: string,
  onStream: (stream: MediaStream | null) => void,
  onState: (state: ViewerStreamState) => void
): () => void {
  const ref = signalDoc(roomId, colName, docId);
  let pc: RTCPeerConnection | null = null;
  let answeredSessionId: string | null = null;
  let appliedHostCandidates = 0;
  let stopped = false;

  const setupPeer = () => {
    pc?.close();
    appliedHostCandidates = 0;
    const peer = new RTCPeerConnection(RTC_CONFIG);
    pc = peer;

    peer.ontrack = (event) => {
      if (stopped || peer !== pc) return;
      onStream(event.streams[0] ?? new MediaStream([event.track]));
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate || stopped || peer !== pc) return;
      updateDoc(ref, {
        viewerCandidates: arrayUnion(serializeCandidate(event.candidate)),
      }).catch(() => {});
    };
    peer.onconnectionstatechange = () => {
      if (stopped || peer !== pc) return;
      if (peer.connectionState === 'connected') onState('live');
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        onState('ended');
        onStream(null);
      }
    };
  };

  setupPeer();
  onState('connecting');
  setDoc(ref, { viewerUid: docId.split('__').pop(), createdAt: serverTimestamp() }).catch(
    () => {}
  );

  const unsub = onSnapshot(ref, async (snap) => {
    const data = snap.data() as RtcSignalDoc | undefined;
    if (!data || stopped || !pc) return;
    try {
      if (data.offer && data.offer.sessionId !== answeredSessionId) {
        answeredSessionId = data.offer.sessionId;
        setupPeer();
        const peer = pc!;
        await peer.setRemoteDescription(
          new RTCSessionDescription({ type: data.offer.type, sdp: data.offer.sdp })
        );
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await updateDoc(ref, {
          answer: { type: answer.type, sdp: answer.sdp ?? '', sessionId: data.offer.sessionId },
          viewerCandidates: [],
        });
      }
      if (pc && pc.remoteDescription) {
        const candidates = data.hostCandidates ?? [];
        for (let i = appliedHostCandidates; i < candidates.length; i++) {
          appliedHostCandidates++;
          await pc
            .addIceCandidate(new RTCIceCandidate(JSON.parse(candidates[i])))
            .catch(() => {});
        }
      }
    } catch {
      // Recover on next snapshot
    }
  });

  return () => {
    stopped = true;
    unsub();
    pc?.close();
    pc = null;
    onStream(null);
    deleteDoc(ref).catch(() => {});
  };
}

// Host: broadcast to every viewer via liveRooms/{roomId}/rtc/{viewerUid}
export function startHostBroadcast(
  roomId: string,
  stream: MediaStream,
  onPeers?: (count: number) => void
): () => void {
  return startPublisherBroadcast(roomId, 'rtc', (id) => id, stream, onPeers);
}

// Seated guest: broadcast via liveRooms/{roomId}/guestRtc/{guestUid}__{viewerUid}
export function startGuestBroadcast(
  roomId: string,
  guestUid: string,
  stream: MediaStream
): () => void {
  const prefix = `${guestUid}__`;
  return startPublisherBroadcast(
    roomId,
    'guestRtc',
    (id) => (id.startsWith(prefix) ? id.slice(prefix.length) : null),
    stream
  );
}

// Viewer: receive the host's live stream
export function joinViewerStream(
  roomId: string,
  viewerUid: string,
  onStream: (stream: MediaStream | null) => void,
  onState: (state: ViewerStreamState) => void
): () => void {
  return joinPublisherStream(roomId, 'rtc', viewerUid, onStream, onState);
}

// Viewer: receive one seated guest's live stream
export function joinGuestStream(
  roomId: string,
  guestUid: string,
  viewerUid: string,
  onStream: (stream: MediaStream | null) => void,
  onState: (state: ViewerStreamState) => void
): () => void {
  return joinPublisherStream(
    roomId,
    'guestRtc',
    `${guestUid}__${viewerUid}`,
    onStream,
    onState
  );
}