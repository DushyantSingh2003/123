# WhatsApp Reseller Meta Ad (v2): creative script

**Format:** 9:16 · 1080×1920 · 30 fps · ~40 s · Reels / Facebook Reels / Meta Ads
**Goal:** within 1–3 seconds she knows the video is about selling **kurti & suit sets from home on WhatsApp**. By the end she thinks *"Main bhi ghar se ye business kar sakti hoon"* and taps the WhatsApp button.

## What changed from v1

The v1 hook ("Roz WhatsApp Status lagati ho na?") didn't say what the reel was about in the first seconds. v2 opens on the actual outfits with the topic in big text and spoken immediately:

- **Frame 1:** a real outfit fills the screen, with **GHAR BAITHE 🏠 / KURTI & SUIT SETS / BECHO WhatsApp se 📲** and a yellow **UNDER ₹599 & ₹999** sticker.
- **0–3 s:** a new photo every ~0.8 s, so she sees 5 outfits before the hook line ends.
- **VO by 2.2 s:** "Ghar baithe WhatsApp se *kurti aur suit sets* bechna hai? Toh ye video poora dekhna!"
- **New price scene:** ₹599 / ₹999 price cards, then *Wholesale price + Aapka margin = Aapka selling price*.

---

## Voiceover (Hinglish, HeyGen "Riya Mehta" female voice)

The HeyGen free plan had only 15 s of voice time left this month, so the voiceover is spliced from 3 clips of the **same voice**. `voice_plan.json` is the exact edit list.

| # | Line | Source clip |
|---|------|-------------|
| 1 | **Ghar baithe WhatsApp se kurti aur suit sets bechna hai?** | new (v2a) |
| 2 | Toh ye video poora dekhna! | new (v2a) |
| 3 | Na dukaan, na bada stock. | v1 |
| 4 | Kaise? | v1 |
| 5 | Hamare WhatsApp reseller group se judo. | v1 |
| 6 | Hum regular naye designs ki photo-video bhejte rahenge. | v1 |
| 7 | Aap unhe apne Status aur Instagram pe daalo. | new (v2b) |
| 8 | Customer ka order aaye, tab humse khareedo. | v1 |
| 9 | Ek piece bhi milega, wholesale rate pe. | v1 |
| 10 | **Kurti aur suit sets, ₹599 aur ₹999 ke andar.** | new (v2a) |
| 11 | Apna margin jodo, aur becho. | v1 |
| 12 | Delivery poore India mein, hum karenge. | v1 |
| 13 | Aur apna khud ka brand banana hai? Website, Meta ads, sourcing... wo bhi hum setup karke dete hain. | v1 |
| 14 | Festive season aa raha hai, abhi shuru karo. | v1 |
| 15 | Neeche button dabao, aur group se judo! | new (v2b) |

The script makes no income claims and no guarantees. The urgency is the real festive season, not fake "group closing" scarcity.

---

## Scene-by-scene (planned timing)

| Time | Beat | Visual | Key on-screen text |
|------|------|--------|-------------------|
| 0.0–4.3 | **Hook: what and how** | 5 outfit photos cut on the beat with flash and zoom (blue tassel set → pink set → white-blue suit → beige vest set → floral shirt set) | GHAR BAITHE 🏠 · **KURTI & SUIT SETS** · BECHO WhatsApp se 📲 · sticker **UNDER ₹599 & ₹999** · "👀 Poora video dekhna!" |
| 4.3–6.4 | No shop / no stock | Product photo darkened; words get struck out with red ✕ | Zaroorat NAHI 👇 · ~~Dukaan~~ ✕ · ~~Bada stock~~ ✕ · **✅ GHAR SE BUSINESS** |
| 6.4–7.1 | Pattern interrupt | Full green screen, music drops out | **KAISE? 👇** |
| 7.1–9.5 | Step 1 | WhatsApp group "Reseller Group 👗✨": you joined, Admin welcome message | STEP 1 · GROUP JOIN KARO |
| 9.5–12.7 | Step 2 | A photo album (+12) and a video message arrive | STEP 2 · NAYE DESIGNS MILENGE |
| 12.7–15.6 | Step 3 | "Share karo" sheet; a finger taps Status ✓ Instagram ✓ Facebook ✓ | STEP 3 · STATUS · INSTA · FB PE DAALO · "Shared! Ab customers dekhenge 👀" |
| 15.6–17.8 | Step 4 | A customer replies to your status: "Ye blue wala set chahiye 😍". You reply "Done ✅" | STEP 4 · ORDER AAYE, TAB KHAREEDO · **ORDER AAYA! 🎉** |
| 17.8–19.9 | Single piece | The pink set held up as one product; sticker and tag slap on | **1 PIECE BHI ✓** · **WHOLESALE RATE** |
| 19.9–25.7 | **Price + margin** | Magenta scene. Price cards pop on the spoken numbers, product strip below, then the equation builds. | KURTI & SUIT SETS · **UNDER ₹599** · **UNDER ₹999** (per piece) → Wholesale price + **Aapka margin 💚** = Aapka selling price ✓ |
| 25.7–27.9 | Delivery | 📦 box, a truck driving across, city pins popping | **PAN INDIA DELIVERY** |
| 27.9–33.9 | Own brand | Phone showing a sample "Aapka Brand" store; cards pop in on each spoken word | Apna khud ka **BRAND**? 👑 → 🌐 Website · 📢 Meta Ads · 🧵 Sourcing → **Sab setup HUM karke denge ✓** |
| 33.9–36.5 | Urgency | Festive maroon and gold, three product cards | **FESTIVE SEASON** aa raha hai! 🪔 · **Abhi shuru karo 🚀** |
| 36.5–39.9 | CTA | Product strip; big pulsing WhatsApp button that gets tapped; recap chips | **WhatsApp Reseller Group** · **[ GROUP JOIN KARO ]** · ✓ 1 piece bhi ✓ Wholesale rate ✓ Pan India delivery ✓ Website + Ads setup · **Neeche button dabao 👇** |

Captions sit inside Meta's Reels safe zone (roughly y = 270–1250 px). The music and sound effects are synthesised in code (`audio/make_audio.py`), so they're royalty-free for paid ads.

---

## Meta ad copy

**Primary text**
> Ghar baithe WhatsApp se kurti aur suit sets becho! 👗📲
> ✅ Na dukaan, na bada stock
> ✅ Kurti & suit sets UNDER ₹599 aur ₹999 (wholesale)
> ✅ 1 piece bhi milega
> ✅ Naye designs ki photos-videos hum denge
> ✅ Pan India delivery
> Apna brand banana hai? Website, Meta ads aur sourcing bhi hum setup karte hain.
> 👇 WhatsApp pe message karo aur reseller group join karo.

**Headline:** Kurti & Suit Sets Under ₹599 | Ghar se Becho
**Description:** 1 piece bhi · Wholesale rate · Pan India delivery
**Button:** Send WhatsApp message (Click-to-WhatsApp)
**Pre-filled message:** "Mujhe reseller group join karna hai"

---

## Check before going live

- **Photo 2 (beige floral shirt set) has a "RAJRISHI" watermark.** If that isn't your brand, send a replacement photo.
- **The prices aren't tied to specific photos.** The ad says "kurti & suit sets under ₹599 / ₹999" but doesn't claim a particular outfit costs ₹599. Tell me which outfit is which price and I can label them.
- **Exchange policy and delivery charges are not mentioned.** Tell me if they apply.
- **The chats, names and counts are illustrative UI,** not testimonials.
- **Confirm your HeyGen plan allows commercial use of the voice in paid ads.**
