# Allstar-Scape behaviours the owner wants reproduced

These come from the owner's memory of the live server (not all are visible in the v2 source in
`allstar/legacy`). They are requirements for Allstar-City, tracked here until implemented.

| # | Behaviour | Source | Status |
| --- | --- | --- | --- |
| Q1 | **Blood rune withdraw stall dupe.** Withdrawing blood runes (565) from the bank adds them to the inventory slowly, one tick at a time; the more withdrawn, the longer the stall. During the stall the player can queue Telekinetic Grab casts on an item on the ground. When the stall ends every queued telegrab fires and each one gives the item, so the item is duplicated once per cast. | owner | todo |
| Q2 | **Stale telegrab dupe.** A telegrab prepared from the right-click menu on a ground item still succeeds after another player has picked that item up, so both players get it. Works with the menu kept open across an emote-tab teleport, so the grab happens out of sight. Also applies to items dropped on death in PK. | owner | todo |
| Q3 | **Floor-above glitch to the admin box.** Command teleports keep the player's height. Climb the first spiky chain in the Slayer Tower (or the SW/SE stairs in the shop area) to height 1, then `::train`: the player lands on the floor above ground, walks past the hedge, reaches the admin zone and clicks the marionette party box (10 of each party hat, santa hat and h'ween mask per click, message "give any of this away and you will be DEMOTED+BANNED!"). `::slayer` and the spiky chain down return to the ground. Needs: height-preserving teleports (done), Allstar's stair/chain handlers, custom objects present on every height (Allstar spawned them client-side on the player's current floor), and object handlers that ignore height. | owner + source (NewObjects has no height) | partial |
| Q4 | **Glowing dagger (747) is a one-hit kill weapon.** Originally the admin kill item; obtainable by players through PK or the telegrab dupe. | owner (not in v2 source) | todo |
| Q5 | **Tzhaar-ket-em (6527, the obsidian "mini maul") one-hit kills** like the glowing dagger. | owner ("I think") | todo |
| Q6 | **'perfect' ring (773) is overpowered**: +10000 in every bonus, as in the older `data/item.cfg` (the loaded v2 `item.cfg` had zeroed it). | owner + data/item.cfg | todo |

## How Q1/Q2 worked in the original code

- `client.fromBank` (legacy client.java L13892) tests `Item.itemStackable[bankItems[slot] + 1]`,
  but `bankItems` already stores id+1, so it checks id+2. Blood runes (565) look up 567, which is
  not stackable, so a withdrawal of N blood runes runs `addItem(565, 1)` N times and sends N
  inventory packets. The client worked through that backlog slowly: the "stall". The server had
  already finished.
- Telekinetic Grab (packet 181, L19873) never checks that the ground item still exists or how far
  away it is: it gives `max(1, amount on the ground)` of the clicked item id, then removes it. While
  the client was stalled the item stayed visible, so every telegrab click reached the server and
  each one paid out. The same missing check lets a stale right-click menu grab an item someone
  already looted, from anywhere.
- It also takes 1 law + 1 air rune (not 5 air), needs Magic 33 but says 21.

Plan for Allstar-City: telegrab with the original semantics (no existence or distance check,
amount at least 1), and a server-side stall for withdrawals of items hit by the id+2 check (derived
from Allstar's stackable flags): the items are added gradually over several cycles and telegrab
casts made during the stall are queued, then all fire when it ends.

Other original bugs are documented in `allstar/spec/*.md` (marked BUG / JUNK). Reproduce them only
when the owner asks.
