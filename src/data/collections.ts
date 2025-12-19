// src/data/collections.ts

export type Network = "Base" | "Arbitrum" | "Degen" | "Ethereum"

export type Collection = {
  id: string
  name: string
  creators: string[]
  miniapp?: string
  opensea?: string
  network: Network
  thumbnail: string
}

export type Group = {
  title: string
  description: string
  lastUpdated: string
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
    name: "Protardio",
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
    name: "Waifu",
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
    name: "FarPixel cats",
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
    miniapp:
      "https://immutagen.ai/mint/c1244fe2-7b40-43c4-871f-c8ed4c13ab83?generationId=6838adb0-e66e-4229-8350-91b518b46efd",
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
    name: "Warplets",
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
    name: "Sheeplet",
    creators: [],
    opensea: "N/A",
    network: "Arbitrum",
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
    creators: [],
    opensea: "https://opensea.io/collection/worldcomputerclub",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "cryptoadickbutts": {
    id: "cryptoadickbutts",
    name: "CryptoaDickButts",
    creators: [],
    opensea: "https://opensea.io/collection/cryptoadickbuttz",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-interns": {
    id: "farcaster-interns",
    name: "Farcaster Interns",
    creators: [],
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
    name: "Farcaster Pro OG",
    creators: ["@miguelgarest"],
    opensea: "https://opensea.io/collection/farcaster-pro-og",
    network: "Base",
    thumbnail: TMP_THUMB
  },

  // New (placeholders, you’ll fill in)
  "of-nft": {
    id: "of-nft",
    name: "OF NFT",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farape-apes": {
    id: "farape-apes",
    name: "Farape Apes",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "fid-azuki": {
    id: "fid-azuki",
    name: "FID Azuki",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-mfer": {
    id: "warplet-mfer",
    name: "Warplet Mfer",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-nouns": {
    id: "warplet-nouns",
    name: "Warplet Nouns",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "warplet-babies": {
    id: "warplet-babies",
    name: "Warplet Babies",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "the-barcode": {
    id: "the-barcode",
    name: "The Barcode",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-constellation": {
    id: "farcaster-constellation",
    name: "Farcaster Constellation",
    creators: [],
    network: "Base",
    thumbnail: TMP_THUMB
  },

  "farcaster-dino": {
    id: "farcaster-dino",
    name: "Farcaster Dino",
    creators: [],
    network: "Arbitrum",
    thumbnail: TMP_THUMB
  },

  arblets: {
    id: "arblets",
    name: "Arblets",
    creators: [],
    network: "Arbitrum",
    thumbnail: TMP_THUMB
  }
}

// Groups reference collections by ID, no duplication.
export const groups: Group[] = [
  {
    title: "The Alpha",
    description: "No allowlist (yet)- mints incoming. Check in again for updates",
    lastUpdated: "Dec 18, 2037",
    featuredId: undefined,
    itemIds: [
      "fid-mfers"
    ]
  },

  {
    title: "Be Early",
    description: "The following allowlists are open",
    lastUpdated: "Dec 18, 2037",
    featuredId: "the-apostles",
    itemIds: [
      "dickpunks",
      "the-apostles"
    ]
  },

  {
    title: "We are Live",
    description: "Time to click buttons. The following limited edition mints are Live.",
    lastUpdated: "Dec 18, 2037",
    featuredId: "protardio",
    itemIds: [
      "protardio",
      "petlets",
      "frosty-friends",
      "waifu"
    ]
  },

  {
    title: "Ongoing mints",
    description: "Projects you can just keep smashing mint button on.",
    lastUpdated: "Dec 18, 2037",
    featuredId: "pixel-noun",
    itemIds: [
      "pixel-noun",
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
      "howlers"
    ]
  },

  {
    title: "You missed the Boat",
    description: "You are late. Mint has ended. Head to OpenSea and click there.",
    lastUpdated: "Dec 18, 2037",
    // Warplets can be in all, but ONLY featured here
    featuredId: "warplets",
    itemIds: [
      "warplets",
      "waifulets",
      "sheeplet",
      "cloakies",
      "base-punks",
      "fid-punks",
      "fid-azuki",
      "farape-apes",
      "arblets",
      "world-computer",
      "cryptoadickbutts",
      "farcaster-interns",
      "x402-toadz",
      "farcaster-pro-og"
    ]
  },

  {
    title: "FID-NFTs",
    description: "NFTs tied to your Farcaster ID (FID)",
    lastUpdated: "Dec 18, 2037",
    featuredId: undefined,
    itemIds: [
      "warplets",
      "arblets",
      "fid-punks",
      "warplet-mfer",
      "fid-azuki",
      "farape-apes",
      "farcaster-dino",
      "warplet-nouns",
      "warplet-babies",
      "howlers",
      "petlets"
    ]
  },

  {
    title: "Warplet-ification",
    description: "NFTs that are derivatives of your Warplet(s)",
    lastUpdated: "Dec 18, 2037",
    featuredId: undefined,
    itemIds: [
      "warplets",
      "petlets",
      "warplet-mfer",
      "warplet-nouns",
      "warplet-babies",
      "arblets",
      "sheeplets"
    ]
  }
]
