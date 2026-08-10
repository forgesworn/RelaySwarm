# Landscape - who else is doing this

The parts are proven separately; the layer between them is not built. Swept
three times with different searches (last on 10 August 2026). Corrections
welcome - an issue with a link beats a polite silence.

## The neighbours

- **[P2P Media Loader](https://github.com/Novage/p2p-media-loader)**
  (Novage, Apache-2.0) - the proven hls.js P2P engine; PeerTube deploys it.
  Discovery is WebTorrent-compatible tracker infrastructure - several
  trackers can be listed and two public defaults ship
  ([FAQ](https://github.com/Novage/p2p-media-loader/blob/main/FAQ.md#what-is-tracker)) -
  but each is a dedicated application-specific service that somebody
  operates, speaking a protocol no Nostr client already speaks. Take the
  trackers away and every viewer falls back onto the origin. Closest relative
  to this project.
- **[Trystero](https://github.com/dmotz/trystero)** (dmotz) - WebRTC
  matchmaking with Nostr as its default signalling network; encrypts SDP,
  moves large payloads between browsers. Independent evidence that the
  signalling substrate works. Deliberately generic - no HLS, no segment
  scheduling, no NIP-53 binding.
- **Swae** (OpenSats-funded) - mobile broadcasting client with centralised
  ingest; its only WebRTC use is guest co-hosting. No overlap with audience
  distribution.
- **[zap.stream](https://zap.stream)** - open-source Rust streaming backend,
  RTMP in, HLS out, self-hostable; no P2P distribution plans found. As an
  hls.js-based client it is a natural adopter of a loader plugin.
- **MoQ** (Cloudflare / IETF media-over-QUIC) - scales fan-out through
  operated relay clusters; someone still runs the infrastructure.
  Complementary transport, not audience peer-assist; a MoQ origin behind a
  peer swarm is a sensible future topology.
- **[Snowflake](https://snowflake.torproject.org)** (Tor Project) - proof at
  scale that volunteer browsers make real censorship-circumvention
  infrastructure, on the same WebRTC data channels. Different job (proxying
  Tor traffic, not distributing media), same substrate.

## The claim, stated narrowly

Browser peer-assist always needs rendezvous infrastructure; peers cannot
find each other from nothing, and RelaySwarm does not pretend to abolish
that. Its claim is about *what kind* of infrastructure: redundant,
general-purpose, stream-selected Nostr relays rather than a dedicated
application-specific tracker. A
[NIP-53](https://github.com/nostr-protocol/nips/blob/master/53.md) live-stream
event can already carry a `relays` tag listing Nostr relays; the proposed
RelaySwarm protocol binds its rendezvous selection to that signed event.

WebRTC-over-Nostr signalling exists (Trystero). Peer-assisted HLS exists
(P2P Media Loader and friends). What does not exist anywhere findable is the
layer itself: a NIP-53-bound peer-assisted HLS protocol that discovers over
the relays a stream already names and defines interoperable events for
segment availability, scheduling and fallback.

**Why not just wire Trystero into P2P Media Loader?** That glue gets you a
demo, not a protocol. Neither piece provides ABR-aware scheduling against
live segment deadlines, origin-authenticated segment digests, live-edge
expiry, origin fallback budgets, churn handling, privacy tiers, or a
specification a second client can implement without either library. The
layer between them is precisely the work.

## The relay objection, and what changed

A 2023 discussion on nostr-protocol/nips
([issue #771](https://github.com/nostr-protocol/nips/issues/771)) objected
that relays reject arbitrary ephemeral kinds and that ICE would time out
over relay latency. Measured in August 2026: relay.damus.io, nos.lol and
relay.primal.net all relay kinds 24170/24171, and Node fan-out signalling
averaged roughly 0.57 seconds ([RESULTS](../spikes/RESULTS.md)). Recorded
Chrome and Safari flows completed verified end-to-end transfers in 3.2 and
2.8 seconds respectively, inside a common 4-second HLS segment. The protocol
answer to the residual concern is that each stream will name its own swarm
relays in its signed NIP-53 event, so no stream depends on the tolerance of
relays it did not select.
