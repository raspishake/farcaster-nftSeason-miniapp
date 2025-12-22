// src/data/collections.ts

export type Network = "Base" | "Arbitrum" | "Degen" | "Ethereum"

// shared override type
export type ActionLabelOverride = {
  miniapp?: string
  opensea?: string
}

export type Collection = {
  id: string
  name: string
  creators: string[]
  miniapp?: string
  opensea?: string
  network: Network
  thumbnail: string
  highlight?: boolean

  // Button label overrides (per-link-type)
  primaryActionLabelOverride?: ActionLabelOverride //to override "Mint" for miniapp:
  secondaryActionLabelOverride?: ActionLabelOverride //to override "OpenSea" for opensea:
}

export type Group = {
  title: string
  description: string
  itemIds: string[]
  featuredId?: string
}

const TMP_THUMB = "/thumbs/tmp.png"

// Single source of truth: define each collection once.
export const collectionsById: Record<string, Collection> = {
  // Existing
  "fid-mfers": {
    id: "fid-mfers",
    name: "fidMfers",
    creators: ["@smolemaru"],
    miniapp: "TBA",
    network: "Base",
    thumbnail: TMP_THUMB
  },

 dickpunks: {
    id: "dickpunks",
    name: "DickPunks",
    creators: ["@madyak"],
    miniapp: "https://farcaster.xyz/miniapps/2vgEwTqkDV2n/dickpunks-waitlist",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "the-apostles": {
    id: "the-apostles",
    name: "The Apostles",
    creators: ["@jesus"],
    miniapp: "https://farcaster.xyz/miniapps/meHZ3K2366qc/the-apostles",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  petlets: {
    id: "petlets",
    name: "Petlets",
    creators: ["@sayangel"],
    miniapp: "https://www.harmonybot.xyz/share/petlets/254221",
    opensea: "https://opensea.io/collection/petlets",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  protardio: {
    id: "protardio",
    name: "Protardios",
    creators: ["@protardio", "@q", "@kuusho"],
    miniapp: "https://farcaster.xyz/miniapps/MqVtma_28MiI/protardio",
    opensea: "https://opensea.io/collection/protardio-citizens",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "frosty-friends": {
    id: "frosty-friends",
    name: "Frosty Friends",
    creators: ["@primenode.eth"],
    miniapp: "https://farcaster.xyz/miniapps/38mV7ok9eAKi/frosty-friends",
    opensea: "https://opensea.io/collection/frosty-friends-677973055",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  waifu: {
    id: "waifu",
    name: "Waifus",
    creators: ["@eggman.eth"],
    miniapp: "https://farcaster.xyz/miniapps/_NawZqxwVR8H/waifu",
    opensea: "https://opensea.io/collection/base-waifus",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "pixel-noun": {
    id: "pixel-noun",
    name: "Pixel Nouns Bot",
    creators: ["@markcarey"],
    miniapp: "https://farcaster.xyz/miniapps/JBWDbpN3nSow/pixel-nouns",
    opensea: "https://explorer.degen.tips/token/0x6fB0F96Bb2dCD32388eBBB6b13608928Ed538218",
    network: "Degen",
    secondaryActionLabelOverride: { opensea: "View" },
    thumbnail: TMP_THUMB
  },

  "paint-people": {
    id: "paint-people",
    name: "Paint People",
    creators: ["@iamtaylor"],
    miniapp: "http://paintpeople.vercel.app/",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "not-punks": {
    id: "not-punks",
    name: "Not Punks",
    creators: ["@pratiksharma.eth"],
    miniapp: "https://farcaster.xyz/miniapps/lvNNJ5A8VRiK/not-punks",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  mogpunks: {
    id: "mogpunks",
    name: "MogPunks",
    creators: ["@xexcy"],
    miniapp: "https://mogpunks-mint.vercel.app/",
    opensea: "https://opensea.io/collection/mogpunks",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farpixel-cats": {
    id: "farpixel-cats",
    name: "FarPixel Cats",
    creators: ["@farpixel", "@Attilagaliba.eth"],
    miniapp: "https://farcaster.xyz/miniapps/dU0eSxtWRBvf/farpixel",
    opensea: "https://opensea.io/collection/farpixelcats",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "tiny-turtles": {
    id: "tiny-turtles",
    name: "Tiny Turtles",
    creators: ["@mfbevan.eth"],
    miniapp:"https://immutagen.ai/mint/c1244fe2-7b40-43c4-871f-c8ed4c13ab83?generationId=6838adb0-e66e-4229-8350-91b518b46efd",
    opensea: "https://opensea.io/collection/the-tiny-turtles",    
    network: "Base",
    thumbnail: TMP_THUMB
  },

  howlers: {
    id: "howlers",
    name: "Howlers",
    creators: ["@sharas.eth"],
    miniapp: "https://farcaster.xyz/miniapps/yBlGKitosGjY/howlers",
    opensea: "https://opensea.io/collection/howlers-on-base",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  // “You missed the Boat” / OpenSea only
  warplets: {
    id: "warplets",
    name: "The Warplets",
    creators: ["@sayangel"],
    opensea: "https://opensea.io/collection/the-warplets-farcaster",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  waifulets: {
    id: "waifulets",
    name: "Waifulets",
    creators: ["@eggman.eth"],
    opensea: "https://opensea.io/collection/waifulets",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  sheeplet: {
    id: "sheeplet",
    name: "Sheeplets",
    creators: ["@basewtf"],
    miniapp: "https://thesheeplets.gobase.wtf/",
    opensea: "https://opensea.io/item/base/0x756325fb738cf88197997cf6e5fc1bfb18963dcd/584",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  cloakies: {
    id: "cloakies",
    name: "Cloakies",
    creators: ["@blainemalone"],
    opensea: "https://opensea.io/collection/cloakies-collection",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "base-punks": {
    id: "base-punks",
    name: "Base Punks",
    creators: ["@gmonchain.eth"],
    opensea: "https://opensea.io/collection/basepunkz-on-base",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "fid-punks": {
    id: "fid-punks",
    name: "FID Punks",
    creators: ["@streetphoto"],
    opensea: "https://opensea.io/collection/fidpunks",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "world-computer": {
    id: "world-computer",
    name: "World Computer",
    creators: ["@Unknown"],
    opensea: "https://opensea.io/collection/worldcomputerclub",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "cryptoadickbutts": {
    id: "cryptoadickbutts",
    name: "CryptoaDickButts",
    creators: ["@Unknown"],
    opensea: "https://opensea.io/collection/cryptoadickbuttz",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-interns": {
    id: "farcaster-interns",
    name: "Farcaster Interns",
    creators: ["@Unknown"],
    opensea: "https://opensea.io/collection/farcaster-interns-3",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "x402-toadz": {
    id: "x402-toadz",
    name: "x402 Toadz",
    creators: ["@maxbuidl.eth"],
    opensea: "https://opensea.io/collection/x402_toadz-club-base",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-pro-og": {
    id: "farcaster-pro-og",
    name: "Farcaster Pro OGs",
    creators: ["@miguelgarest"],
    opensea: "https://opensea.io/collection/farcaster-pro-og",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  // More projects
  "og-nft": {
    id: "og-nft",
    name: "OG NFTs",
    creators: ["@Unknown"],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farape-apes": {
    id: "farape-apes",
    name: "Farape Apes",
    creators: ["@recessdotfun"],
    miniapp: "https://farcaster.xyz/miniapps/sqYk09wRm676/farape",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "fid-azuki": {
    id: "fid-azuki",
    name: "FID Azukis",
    creators: ["@ritukumari.eth"],
    opensea: "https://opensea.io/collection/fidazuki",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-mfer": {
    id: "warplet-mfer",
    name: "Warplet Mfers",
    creators: ["@markcarey"],
    miniapp: "https://farcaster.xyz/miniapps/XQktyvz1H9zn/warplet-mfers",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-nouns": {
    id: "warplet-nouns",
    name: "Warplet Nouns",
    creators: ["@markcarey"],
    miniapp: "https://farcaster.xyz/miniapps/Pvs6xfVCnvqn/warplet-nouns",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-babies": {
    id: "warplet-babies",
    name: "Warplet Babies",
    creators: ["@markcarey"],
    miniapp: "https://farcaster.xyz/miniapps/iyhggRrAsWJK/warplet-babies",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "the-barcode": {
    id: "the-barcode",
    name: "The Barcode",
    creators: ["@thebarcode"],
    miniapp: "https://farcaster.xyz/miniapps/lGupNaXO2fv8/the-barcode",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-constellation": {
    id: "farcaster-constellation",
    name: "Farcaster Social Constellation NFTs",
    creators: ["@jesse7.eth"],
    miniapp: "https://farcaster.xyz/miniapps/1QWOndscTLyV/social-constellation-nft",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-dino": {
    id: "farcaster-dino",
    name: "Farcaster Dinos",
    creators: ["@0xsayan.eth"],
    miniapp: "https://farcaster.xyz/miniapps/Pjm_FOONcY1K/farcaster-dinos-mint",
    network: "Arbitrum",
    thumbnail: TMP_THUMB
  },

  arblets: {
    id: "arblets",
    name: "Arblets",
    creators: ["@0xanas.eth"],
    miniapp: "https://farcaster.xyz/miniapps/IxzbMlpQLNCZ/the-arblets",
    network: "Arbitrum",
    thumbnail: TMP_THUMB
  },

  "based-build": {
    id: "based-build",
    name: "Based Build",
    creators: ["@mevmonk"],
    miniapp: "https://basedbuilds.xyz/share?token=3&tx=0x0c33ab7d327ee94e28b1714a174fe097cdd251ee222d13799da23e559636c1b6",
    opensea: "https://opensea.io/collection/basedbuilds",
    network: "Base",
    highlight: true,
    thumbnail: TMP_THUMB
  },

  sophlet: {
    id: "sophlet",
    name: "Sophlets",
    creators: ["@chriscocreated"],
    miniapp: "https://immutagen.ai/mint/d964d9a2-6707-4b3e-98a5-c505ae0d04d1?generationId=978c332b-aa9d-42c0-b8d0-7c044ca023a9",
    network: "Base",
    highlight: true,
    thumbnail: TMP_THUMB
  },

  "warplet-sweaters": {
    id: "warplet-sweaters",
    name: "Warplet Sweaters",
    creators: ["@markcarey"],
    miniapp: "https://warpletsweaters.frm.lol/warpletsweaters/minted/bafybeifsroay74hao3sctvjxfekvuvtmzhg6azofbbseawj2ixqmc7bzku",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "wecastwarplets-49k-mint": {
    id: "wecastwarplets-49k-mint",
    name: "WeCast Warplets",
    creators: ["@chriscocreated"],
    miniapp: "https://farcaster.xyz/miniapps/DLMNg-iBux-P/wecastwarplets-49k-mint",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-mash-up": {
    id: "warplet-mash-up",
    name: "Warplet Mash Up",
    creators: ["@alec.eth"],
    miniapp: "https://warplet-mashup.vercel.app/mashup/1766299224302-doo0vrdt3?participants=sayangel%2Clevertz&image=https%3A%2F%2Fcoral-sophisticated-albatross-902.mypinata.cloud%2Fipfs%2FQmNWvYmsSZMXrqt2iz36v7sWbKatNzzhZm3rgzSGqTU5E2",
    network: "Base",
    highlight: true,
    thumbnail: TMP_THUMB
  },

  "sweep": {
    id: "sweep",
    name: "Sweep Zone",
    creators: ["@horsefacts.eth"],
    miniapp: "https://farcaster.xyz/miniapps/B94B28OhXPTH/sweepzone",
    network: "Base",
    highlight: true,
    primaryActionLabelOverride: {
	miniapp: "Open"
    },
    thumbnail: TMP_THUMB
  }
}

// Groups reference collections by ID, no duplication.
export const groups: Group[] = [
  {
    title: "The Alpha",
    description: "No allowlist (yet)- mints incoming. Check in again for updates",
    featuredId: "fid-mfers",
    itemIds: [
    ]
  },

  {
    title: "Be Early",
    description: "The following allowlists are open",
    featuredId: "the-apostles",
    itemIds: [
      "dickpunks",
    ]
  },

  {
    title: "New Launches",
    description: "Time to click buttons. The following limited edition mints are Live.",
    featuredId: "protardio",
    itemIds: [
      "petlets",
      "frosty-friends",
      "waifu",
      "sophlet",
      "based-build",
      "warplet-mash-up",
      "warplet-sweaters"
    ]
  },

  {
    title: "Ongoing mints",
    description: "Projects you can just keep smashing mint button on.",
    featuredId: "pixel-noun",
    itemIds: [
      "paint-people",
      "warplet-mfer",
      "warplet-nouns",
      "warplet-babies",
      "farcaster-constellation",
      "farcaster-dino",
      "not-punks",
      "mogpunks",
      "farpixel-cats",
      "tiny-turtles",
      "the-barcode",
      "farape-apes",
      "sheeplet",
      "wecastwarplets-49k-mint",
      "howlers"
    ]
  },

  {
    title: "You missed the Boat",
    description: "You are late. Mint has ended. Head to OpenSea and click there.",
    featuredId: "warplets",
    itemIds: [
      "waifulets",
      "cloakies",
      "base-punks",
      "fid-punks",
      "fid-azuki",
      "arblets",
      "world-computer",
      "cryptoadickbutts",
      "farcaster-interns",
      "x402-toadz",
      "og-nft",
      "farcaster-pro-og"
    ]
  },

  {
    title: "FID-NFTs",
    description: "NFTs tied to your Farcaster ID (FID)",
    featuredId: "warplets",
    itemIds: [
      "arblets",
      "fid-punks",
      "warplet-mfer",
      "fid-azuki",
      "farape-apes",
      "farcaster-dino",
      "warplet-nouns",
      "warplet-babies",
      "warplet-sweaters",
      "howlers",
      "petlets",
      "sophlet",
      "tiny-turtles"
    ]
  },

  {
    title: "Warplet-ification",
    description: "NFTs that are derivatives of your Warplet(s)",
    featuredId: "petlets",
    itemIds: [
      "warplets",
      "warplet-mfer",
      "warplet-nouns",
      "warplet-babies",
      "warplet-sweaters",
      "arblets",
      "wecastwarplets-49k-mint",
      "warplet-mash-up",
      "sheeplet"
    ]
  },

  {
    title: "OG Collections",
    description: "NFTs that launched on Farcaster before the Farcaster Pro OG NFTs in June, 2025",
    featuredId: "cryptoadickbutts",
    itemIds: [
      "farcaster-interns",
    ]
  },

  {
    title: "Other Cool Miniapps",
    description: "Some other cool miniapps related to Farcaster NFTs collection curation",
    featuredId: "sweep",
    itemIds: [
    ]
  }
]
