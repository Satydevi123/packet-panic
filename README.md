# Packet Panic — Multiplayer Network Rescue

## Start

1. Install Node.js 20 or newer.
2. In this `packet-panic` folder run `npm install` and `npm start`.
3. Open http://localhost:3000.
4. Create a room and use **Copy invite** to share the room link.

## Fixes in this version

- Copy invite confirms success and provides a fallback if clipboard access is blocked.
- Player sessions persist in browser localStorage, so refreshing rejoins the same room with the same score and host role.
- The server retains empty rooms for 10 minutes to permit reconnects.
- Invalid room codes show an error instead of creating a new room.
- A player reconnecting during a live game can resume playing.

## Notes

- Restarting the Node.js server clears all rooms because room state is in memory.
- Reconnection works in the **same browser profile**. Incognito and normal Chrome have separate sessions.
- Room invite links work across devices only after you deploy to a publicly accessible HTTPS host; localhost is only accessible on your own computer.
- Player session tokens are stored locally. Do not share them; only share invite URLs.


## v1.4 Visual Upgrade
Updated responsive cyber-operations styling, animated topology illustration, polished incident cards, dashboard, and victory presentation. Server and game JavaScript are unchanged from v1.3, preserving room codes, invite copying, refresh/rejoin, scores, and winner announcements.
