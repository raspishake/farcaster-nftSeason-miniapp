// src/data/collections.ts

export type Network = "Base" | "Arbitrum" | "Ethereum"

export type Collection = {
  name: string
  creators: string[]
  miniapp?: string
  opensea?: string
  network: Network
  featured: boolean
  thumbnail: string
}

export type Group = {
  title: string
  description: string
  lastUpdated: string
  items: Collection[]
}

const TMP_THUMB = "/thumbs/tmp.png"

export const groups: Group[] = [
  {
    title: "The Alpha",
    description: "No waitlist (yet)",
    lastUpdated: "2025-09-18",
    items: [
      {
        name: "fidMfers",
        creators: ["@smolemaru"],
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      }
    ]
  },

  {
    title: "Be Early",
    description: "The following allowlists are open",
    lastUpdated: "2025-09-18",
    items: [
      {
        name: "DickPunks",
        creators: ["@madyak"],
        miniapp: "https://farcaster.xyz/miniapps/2vgEwTqkDV2n/dickpunks-waitlist",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "The Apostles",
        creators: ["@jesus"],
        miniapp: "https://farcaster.xyz/miniapps/meHZ3K2366qc/the-apostles",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      }
    ]
  },

  {
    title: "We are Live",
    description: "Time to click buttons. The following limited edition mints are Live.",
    lastUpdated: "2025-09-18",
    items: [
      {
        name: "Protardio",
        creators: ["@protardio", "@q", "@kuusho"],
        miniapp: "https://farcaster.xyz/miniapps/MqVtma_28MiI/protardio",
        opensea: "https://opensea.io/collection/protardio-citizens",
        network: "Base",
        featured: true,
        thumbnail: TMP_THUMB
      },
      {
        name: "Petlets",
        creators: ["@sayangel", "@harmonybot"],
        miniapp: "https://www.harmonybot.xyz/share/petlets/254221",
        opensea: "https://opensea.io/collection/petlets",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Frosty Friends",
        creators: ["@primenode.eth"],
        miniapp: "https://farcaster.xyz/miniapps/38mV7ok9eAKi/frosty-friends",
        opensea: "https://opensea.io/collection/frosty-friends-677973055",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Waifu",
        creators: ["@eggman.eth"],
        miniapp: "https://farcaster.xyz/miniapps/_NawZqxwVR8H/waifu",
        opensea: "https://opensea.io/collection/base-waifus",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      }
    ]
  },

  {
    title: "Ongoing mints",
    description: "Projects you can just keep smashing mint button on.",
    lastUpdated: "2025-09-18",
    items: [
      {
        name: "Pixel Noun",
        creators: ["@markcarey"],
        miniapp: "https://farcaster.xyz/miniapps/JBWDbpN3nSow/pixel-nouns",
        network: "Base",
        featured: true,
        thumbnail: TMP_THUMB
      },
      {
        name: "Paint People",
        creators: ["@dario1234", "@iamtaylor"],
        miniapp: "http://paintpeople.vercel.app/",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Not Punks",
        creators: ["@pratiksharma.eth"],
        miniapp: "https://farcaster.xyz/miniapps/lvNNJ5A8VRiK/not-punks",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "MogPunks",
        creators: ["@xexcy"],
        miniapp: "https://mogpunks-mint.vercel.app/",
        opensea: "https://opensea.io/collection/mogpunks",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "FarPixel cats",
        creators: ["@farpixel", "@attilagaliba.eth"],
        miniapp: "https://farcaster.xyz/miniapps/dU0eSxtWRBvf/farpixel",
        opensea: "https://opensea.io/collection/farpixelcats",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Tiny Turtles",
        creators: ["@mfbevan.eth"],
        miniapp:
          "https://immutagen.ai/mint/c1244fe2-7b40-43c4-871f-c8ed4c13ab83?generationId=6838adb0-e66e-4229-8350-91b518b46efd",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Howlers",
        creators: ["@sharas.eth"],
        miniapp: "https://farcaster.xyz/miniapps/yBlGKitosGjY/howlers",
        opensea: "https://opensea.io/collection/howlers-on-base",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      }
    ]
  },

  {
    title: "You missed the Boat",
    description: "You are late. Mint has ended. Head to OpenSea and click there.",
    lastUpdated: "2025-09-18",
    items: [
      {
        name: "Warplets",
        creators: ["@sayangel", "@harmonybot"],
        opensea: "https://opensea.io/collection/the-warplets-farcaster",
        network: "Base",
        featured: true,
        thumbnail: TMP_THUMB
      },
      {
        name: "Waifulets",
        creators: ["@eggman.eth"],
        opensea: "https://opensea.io/collection/waifulets",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Sheeplet",
        creators: [],
        network: "Arbitrum",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Cloakies",
        creators: ["@blainemalone"],
        opensea: "https://opensea.io/collection/cloakies-collection",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Base Punks",
        creators: ["@gmonchain.eth"],
        opensea: "https://opensea.io/collection/basepunkz-on-base",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "FID Punks",
        creators: ["@streetphoto"],
        opensea: "https://opensea.io/collection/fidpunks",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "World Computer",
        creators: [],
        opensea: "https://opensea.io/collection/worldcomputerclub",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "CryptoaDickButts",
        creators: [],
        opensea: "https://opensea.io/collection/cryptoadickbuttz",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Farcaster Interns",
        creators: [],
        opensea: "https://opensea.io/collection/farcaster-interns-3",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "x402 Toadz",
        creators: ["@maxbuild.eth"],
        opensea: "https://opensea.io/collection/x402_toadz-club-base",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      },
      {
        name: "Farcaster Pro OG",
        creators: ["@miguelgarest"],
        opensea: "https://opensea.io/collection/farcaster-pro-og",
        network: "Base",
        featured: false,
        thumbnail: TMP_THUMB
      }
    ]
  }
]
