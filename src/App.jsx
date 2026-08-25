import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

// Supabase configuration.
// Put these in your Vite .env file:
// VITE_SUPABASE_URL=https://vqxtkmmvkeunrxgvkjzc.supabase.co
// VITE_SUPABASE_ANON_KEY=your_publishable_key
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://vqxtkmmvkeunrxgvkjzc.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const POST_IMAGE_BUCKET = "post-images";
const POST_IMAGE_TOKEN_PREFIX = "[[CHAINWALL_IMAGE:";
const POST_IMAGE_TOKEN_SUFFIX = "]]";

function parsePostContent(rawContent = "") {
  const raw = String(rawContent || "");
  const match = raw.match(
    /\s*\[\[CHAINWALL_IMAGE:(https?:\/\/[^\]]+)\]\]\s*$/
  );

  if (!match) {
    return { text: raw, imageUrl: "" };
  }

  return {
    text: raw.slice(0, match.index).trim(),
    imageUrl: match[1],
  };
}

function buildPostContent(text, imageUrl = "") {
  const cleanText = String(text || "").trim();
  if (!imageUrl) return cleanText;
  const base = cleanText || "Image post";
  return `${base}\n${POST_IMAGE_TOKEN_PREFIX}${imageUrl}${POST_IMAGE_TOKEN_SUFFIX}`;
}

// Small in-memory profile cache so the UI can still render profile avatars
// synchronously while Supabase data is being loaded.
const profileCache = new Map();

// Deploy ChainWallV2.sol, then paste the new contract address here.
// ChainWall V2 deployed contract
const CONTRACT_ADDRESS = "0x8849372ad6675f636b10Dc2A08E63271947C16F5";
const CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "string", name: "username", type: "string" },
      { indexed: false, internalType: "string", name: "content", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "MessagePosted",
    type: "event"
  },
  { inputs: [{ internalType: "string", name: "username", type: "string" }, { internalType: "string", name: "content", type: "string" }], name: "postMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }, { internalType: "string", name: "newContent", type: "string" }], name: "editMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "deleteMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }, { internalType: "string", name: "reason", type: "string" }], name: "reportMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "likeMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "unlikeMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "messageId", type: "uint256" }, { internalType: "string", name: "username", type: "string" }, { internalType: "string", name: "content", type: "string" }], name: "addComment", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "commentId", type: "uint256" }], name: "deleteComment", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "repostMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "id", type: "uint256" }], name: "unrepostMessage", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getMessageCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }],
    name: "getMessage",
    outputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "string", name: "username", type: "string" },
      { internalType: "string", name: "content", type: "string" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "uint256", name: "messageId", type: "uint256" },
      { internalType: "uint256", name: "editedAt", type: "uint256" },
      { internalType: "bool", name: "deleted", type: "bool" },
      { internalType: "uint256", name: "reportCount", type: "uint256" },
      { internalType: "uint256", name: "likeCount", type: "uint256" },
      { internalType: "uint256", name: "commentCount", type: "uint256" },
      { internalType: "uint256", name: "repostCount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  { inputs: [], name: "getCommentCount", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ internalType: "uint256", name: "commentId", type: "uint256" }],
    name: "getComment",
    outputs: [
      { internalType: "uint256", name: "id", type: "uint256" },
      { internalType: "uint256", name: "messageId", type: "uint256" },
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "string", name: "username", type: "string" },
      { internalType: "string", name: "content", type: "string" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "bool", name: "deleted", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "id", type: "uint256" }, { internalType: "address", name: "user", type: "address" }],
    name: "getUserMessageState",
    outputs: [
      { internalType: "bool", name: "liked", type: "bool" },
      { internalType: "bool", name: "reposted", type: "bool" },
      { internalType: "bool", name: "reported", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

/* =====================================================
   WALLET / CONTRACT HELPERS
===================================================== */

function getProvider(injectedProvider = null) {
  const ethereum = injectedProvider || window.ethereum;

  if (!ethereum) {
    throw new Error(
      "Wallet not found. Please install MetaMask or a compatible wallet."
    );
  }

  return new BrowserProvider(ethereum);
}

function formatAddress(address) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTime(timestamp) {
  if (!timestamp) return "";

  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function getProfileStorageKey(address) {
  return `chainwall-profile-${address?.toLowerCase() || "guest"}`;
}

function getSocialStorageKey(address) {
  return `chainwall-social-${address?.toLowerCase() || "guest"}`;
}

function loadProfile(address) {
  if (!address) return null;

  const key = address.toLowerCase();

  if (profileCache.has(key)) {
    return profileCache.get(key);
  }

  // Keep localStorage as a compatibility fallback while migrating old
  // ChainWall profiles into Supabase.
  try {
    const saved = localStorage.getItem(getProfileStorageKey(address));
    const profile = saved ? JSON.parse(saved) : null;

    if (profile) {
      profileCache.set(key, profile);
    }

    return profile;
  } catch {
    return null;
  }
}

async function loadProfileFromSupabase(address) {
  if (!address) return null;

  const localProfile = loadProfile(address);

  if (!supabase) {
    return localProfile;
  }

  try {
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("wallet_address, username, bio, avatar_url")
      .eq("wallet_address", address)
      .maybeSingle();

    if (queryError) {
      console.warn("[ChainWall] Supabase profile read failed:", queryError);
      return localProfile;
    }

    if (!data) {
      if (localProfile) {
        await saveProfileToSupabase(address, localProfile);
      }
      return localProfile;
    }

    const profile = {
      username: data.username || "",
      bio: data.bio || "",
      avatar: data.avatar_url || "",
      wallet: data.wallet_address || address,
      createdAt: localProfile?.createdAt || Date.now(),
    };

    profileCache.set(address.toLowerCase(), profile);

    // Keep the local copy as a fallback for offline rendering.
    try {
      localStorage.setItem(
        getProfileStorageKey(address),
        JSON.stringify(profile)
      );
    } catch {
      // Ignore localStorage errors.
    }

    return profile;
  } catch (error) {
    console.warn("[ChainWall] Unable to load Supabase profile:", error);
    return localProfile;
  }
}

function saveProfile(address, profile) {
  if (!address || !profile) return;

  profileCache.set(address.toLowerCase(), profile);

  try {
    localStorage.setItem(
      getProfileStorageKey(address),
      JSON.stringify(profile)
    );
  } catch {
    // Ignore localStorage errors.
  }
}

async function saveProfileToSupabase(address, profile) {
  if (!supabase || !address || !profile) return false;

  try {
    // Large base64 images are intentionally not sent to the database.
    // They remain available through the local fallback until Supabase Storage
    // is configured for avatars.
    const avatarUrl =
      profile.avatar && profile.avatar.length <= 600000
        ? profile.avatar
        : "";

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          wallet_address: address,
          username: profile.username,
          bio: profile.bio || "",
          avatar_url: avatarUrl,
        },
        { onConflict: "wallet_address" }
      );

    if (upsertError) {
      console.warn("[ChainWall] Supabase profile save failed:", upsertError);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[ChainWall] Unable to save Supabase profile:", error);
    return false;
  }
}

function loadSocialData(address) {
  const emptyData = {
    likes: [],
    reposts: [],
    comments: {},
  };

  if (!address) return emptyData;

  try {
    const raw = localStorage.getItem(getSocialStorageKey(address));

    if (!raw) return emptyData;

    const parsed = JSON.parse(raw);

    return {
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      reposts: Array.isArray(parsed.reposts) ? parsed.reposts : [],
      comments:
        parsed.comments && typeof parsed.comments === "object"
          ? parsed.comments
          : {},
    };
  } catch {
    return emptyData;
  }
}

function saveSocialData(address, data) {
  if (!address) return;

  try {
    localStorage.setItem(
      getSocialStorageKey(address),
      JSON.stringify(data)
    );
  } catch {
    // Ignore localStorage errors.
  }
}

async function syncLikeToSupabase(messageId, walletAddress, liked) {
  if (!supabase || !walletAddress) return;

  try {
    if (liked) {
      const { data: existing, error: findError } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", messageId)
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (findError) {
        console.warn("[ChainWall] Like lookup failed:", findError);
        return;
      }

      if (!existing) {
        const { error: insertError } = await supabase.from("likes").insert({
          post_id: messageId,
          wallet_address: walletAddress,
        });

        if (insertError) {
          throw insertError;
        }
      }
    } else {
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", messageId)
        .eq("wallet_address", walletAddress);

      if (deleteError) {
        throw deleteError;
      }
    }
  } catch (error) {
    console.error("[ChainWall] Like Supabase sync failed:", error);
    throw error;
  }
}

async function syncRepostToSupabase(messageId, walletAddress, reposted) {
  if (!supabase || !walletAddress) return;

  try {
    if (reposted) {
      const { data: existing, error: findError } = await supabase
        .from("reposts")
        .select("id")
        .eq("post_id", messageId)
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (findError) {
        console.warn("[ChainWall] Repost lookup failed:", findError);
        return;
      }

      if (!existing) {
        const { error: insertError } = await supabase.from("reposts").insert({
          post_id: messageId,
          wallet_address: walletAddress,
        });

        if (insertError) {
          throw insertError;
        }
      }
    } else {
      const { error: deleteError } = await supabase
        .from("reposts")
        .delete()
        .eq("post_id", messageId)
        .eq("wallet_address", walletAddress);

      if (deleteError) {
        throw deleteError;
      }
    }
  } catch (error) {
    console.error("[ChainWall] Repost Supabase sync failed:", error);
    throw error;
  }
}

async function syncCommentToSupabase(messageId, walletAddress, content) {
  if (!supabase || !walletAddress || !content) return null;

  try {
    const { data, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: messageId,
        wallet_address: walletAddress,
        content,
      })
      .select("id, post_id, wallet_address, content, created_at")
      .single();

    if (insertError) {
      console.warn("[ChainWall] Comment sync failed:", insertError);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[ChainWall] Comment Supabase sync failed:", error);
    throw error;
  }
}

async function createSupabaseNotification({
  recipientWallet,
  senderWallet,
  type,
  postId,
}) {
  if (!supabase || !recipientWallet || !senderWallet) return;

  if (recipientWallet.toLowerCase() === senderWallet.toLowerCase()) {
    return;
  }

  try {
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_wallet: recipientWallet,
        sender_wallet: senderWallet,
        type,
        post_id: postId,
      });

    if (notificationError) {
      console.warn(
        "[ChainWall] Notification sync failed:",
        notificationError
      );
    }
  } catch (error) {
    console.warn(
      "[ChainWall] Supabase notification failed:",
      error
    );
  }
}

function getFallbackWalletOptions() {
  if (typeof window === "undefined") return [];

  const providers = Array.isArray(window.ethereum?.providers)
    ? window.ethereum.providers
    : window.ethereum
    ? [window.ethereum]
    : [];

  const seenProviders = new Set();
  const seenNames = new Set();
  const results = [];

  providers.forEach((provider) => {
    if (!provider || seenProviders.has(provider)) return;
    seenProviders.add(provider);

    let name = "Browser Wallet";

    if (provider.isOkxWallet) {
      name = "OKX Wallet";
    } else if (provider.isCoinbaseWallet) {
      name = "Coinbase Wallet";
    } else if (provider.isPhantom) {
      name = "Phantom";
    } else if (provider.isMetaMask) {
      name = "MetaMask";
    }

    // Some browsers expose the same injected wallet more than once.
    // ChainWall should show each wallet brand only once.
    const normalizedName = name.trim().toLowerCase();

    if (seenNames.has(normalizedName)) return;
    seenNames.add(normalizedName);

    results.push({
      info: {
        uuid: `fallback-${normalizedName.replace(/[^a-z0-9]+/g, "-")}`,
        name,
        icon: "",
        rdns: "",
      },
      provider,
    });
  });

  return results;
}

function dedupeWallets(wallets = []) {
  const byName = new Map();

  wallets.forEach((wallet) => {
    if (!wallet?.provider || !wallet?.info?.name) return;

    const name = wallet.info.name.trim();
    const key = name.toLowerCase();

    if (!byName.has(key)) {
      byName.set(key, wallet);
    }
  });

  return Array.from(byName.values());
}

function getAvatarSeed(value = "ChainWall") {
  return String(value)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getAvatarClass(value = "ChainWall") {
  return `generated-avatar avatar-color-${getAvatarSeed(value) % 6}`;
}

function Avatar({ src, name, large = false, className = "" }) {
  const label = (name || "C").trim().charAt(0).toUpperCase() || "C";
  const classes = `${large ? "avatar-large" : "avatar"} ${
    src ? "uploaded-avatar" : getAvatarClass(name)
  } ${className}`.trim();

  if (src) {
    return (
      <img
        className={classes}
        src={src}
        alt={`${name || "ChainWall"} profile`}
      />
    );
  }

  return <div className={classes}>{label}</div>;
}

/* =====================================================
   APP
===================================================== */

function App() {
  const [page, setPage] = useState("landing");

  const [account, setAccount] = useState("");
  const [profile, setProfile] = useState(null);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletOptions, setWalletOptions] = useState([]);
  const [activeWalletProvider, setActiveWalletProvider] = useState(null);

  const [usernameInput, setUsernameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");

  const [content, setContent] = useState("");
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState("");

  const [messages, setMessages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [transactionHash, setTransactionHash] = useState("");

  const [socialData, setSocialData] = useState({
    likes: [],
    reposts: [],
    comments: {},
  });

  const [commentInputs, setCommentInputs] = useState({});

  // Global Wall moderation/editing state
  const [editingMessage, setEditingMessage] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  /* =====================================================
     CONTRACT
  ===================================================== */

  async function getContract(withSigner = false) {
    const provider = getProvider(activeWalletProvider);

    if (withSigner) {
      const signer = await provider.getSigner();

      return new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
    }

    return new Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );
  }

  /* =====================================================
     WALLET
  ===================================================== */

  async function connectWallet(selectedProvider = null) {
    try {
      setError("");
      setSuccess("");

      const injectedProvider =
        selectedProvider ||
        activeWalletProvider ||
        window.ethereum;

      if (!injectedProvider) {
        setError(
          "No compatible wallet was detected. Install a wallet extension and try again."
        );
        return;
      }

      const provider = getProvider(injectedProvider);
      setActiveWalletProvider(injectedProvider);

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      if (!accounts || accounts.length === 0) {
        return;
      }

      setWalletModalOpen(false);

      const connectedAccount = accounts[0];

      const existingProfile =
        await loadProfileFromSupabase(connectedAccount);

      setAccount(connectedAccount);
      setSocialData(loadSocialData(connectedAccount));

      // Connecting the wallet from the Home page must NOT navigate away.
      // The user can choose Dashboard/Profile explicitly from the navigation.
      if (existingProfile) {
        setProfile(existingProfile);
        setAvatarInput(existingProfile.avatar || "");
      } else {
        setProfile(null);
        setUsernameInput("");
        setBioInput("");
        setAvatarInput("");
      }
    } catch (err) {
      console.error(err);

      if (err?.code === 4001) {
        setError("Wallet connection was rejected.");
      } else {
        setError(
          err?.message || "Unable to connect wallet."
        );
      }
    }
  }

  function disconnectWallet() {
    setAccount("");
    setActiveWalletProvider(null);
    setWalletModalOpen(false);
    setProfile(null);
    setPage("landing");
    setMessages([]);

    setSocialData({
      likes: [],
      reposts: [],
      comments: {},
    });

    setUsernameInput("");
    setBioInput("");
    setAvatarInput("");
    setContent("");
    setCommentInputs({});

    setError("");
    setSuccess("");
    setTransactionHash("");
  }

  /* =====================================================
     PROFILE
  ===================================================== */

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAvatarInput(result);
    };

    reader.onerror = () => {
      setError("Unable to read that image. Please try another one.");
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarInput("");
    setSuccess("Profile picture removed. Your generated avatar will be used.");
  }

  async function createProfile(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!account) {
      setError("Please connect your wallet first.");
      return;
    }

    const username = usernameInput.trim();
    const bio = bioInput.trim();

    if (!username) {
      setError("Please enter a username.");
      return;
    }

    if (username.length < 2) {
      setError("Username must contain at least 2 characters.");
      return;
    }

    if (username.length > 30) {
      setError(
        "Username cannot be longer than 30 characters."
      );
      return;
    }

    if (bio.length > 160) {
      setError("Bio cannot be longer than 160 characters.");
      return;
    }

    const newProfile = {
      username,
      bio,
      avatar: avatarInput || "",
      wallet: account,
      createdAt: profile?.createdAt || Date.now(),
    };

    saveProfile(account, newProfile);
    await saveProfileToSupabase(account, newProfile);

    setProfile(newProfile);
    setSuccess("Profile created successfully!");

    setTimeout(() => {
      setSuccess("");

      // Creating a profile for the first time continues to Global Wall.
      // Editing an existing profile keeps the user inside Profile Settings.
      if (profile) {
        setPage("profile");
      } else {
        setPage("global");
      }
    }, 700);
  }

  /* =====================================================
     LOAD MESSAGES
  ===================================================== */

  async function loadMessages() {
    try {
      setLoadingHistory(true);
      setError("");

      // Always use the currently selected wallet provider and verify Arc Testnet.
      const provider = getProvider(activeWalletProvider);
      const network = await provider.getNetwork();

      if (network.chainId !== 5042002n) {
        throw new Error(
          `Wrong network. ChainWall uses Arc Testnet (chain ID 5042002), but the wallet is on chain ${network.chainId.toString()}.`
        );
      }

      const contract = new Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const count = await contract.getMessageCount();
      const total = Number(count);

      console.log(
        "[ChainWall] Reading messages from",
        CONTRACT_ADDRESS,
        "count:",
        total
      );

      const formattedMessages = [];

      // IMPORTANT:
      // Do not use Promise.all() here. One failed read used to make the
      // entire feed disappear. Read each post independently instead.
      for (let i = 0; i < total; i += 1) {
        try {
          const message = await contract.getMessage(i);

          const sender = message[0];
          const username = message[1];
          const messageContent = message[2];
          const timestamp = message[3];
          const messageId = message[4];
          const editedAt = message[5];
          const deletedValue = message[6];
          const reportCount = message[7];
          const likeCount = message[8];
          const commentCount = message[9];
          const repostCount = message[10];

          const deleted =
            deletedValue === true ||
            deletedValue === 1 ||
            deletedValue === 1n ||
            (typeof deletedValue === "string" &&
              deletedValue.toLowerCase() === "true");

          let liked = false;
          let reposted = false;
          let reported = false;

          formattedMessages.push({
            id: Number(messageId),
            sender,
            username,
            content: messageContent,
            timestamp: Number(timestamp),
            editedAt: Number(editedAt || 0),
            deleted,
            reportCount: Number(reportCount || 0),
            likeCount: Number(likeCount || 0),
            commentCount: Number(commentCount || 0),
            repostCount: Number(repostCount || 0),
            liked,
            reposted,
            reported,
          });
        } catch (messageError) {
          // Keep loading the remaining posts instead of blanking the whole feed.
          console.error(
            `[ChainWall] Failed to read message ${i}:`,
            messageError
          );
        }
      }

      // Newest first.
      formattedMessages.sort((a, b) => b.id - a.id);

      // Warm the profile cache for every post author so avatars/usernames
      // can be rendered immediately from Supabase on the next render.
      if (supabase) {
        const uniqueSenders = [
          ...new Set(formattedMessages.map((item) => item.sender).filter(Boolean)),
        ];

        await Promise.all(
          uniqueSenders.map((sender) => loadProfileFromSupabase(sender))
        );
      }

      // Supabase is the source of truth for social actions. Likes and reposts
      // NEVER call the blockchain and NEVER open the wallet.
      if (supabase) {
        try {
          const [likesResult, repostsResult] = await Promise.all([
            supabase
              .from("likes")
              .select("id, post_id, wallet_address"),
            supabase
              .from("reposts")
              .select("id, post_id, wallet_address"),
          ]);

          if (likesResult.error) {
            console.warn("[ChainWall] Supabase likes read failed:", likesResult.error);
          }

          if (repostsResult.error) {
            console.warn("[ChainWall] Supabase reposts read failed:", repostsResult.error);
          }

          const likesByPost = new Map();
          const likedByMe = new Set();

          for (const like of likesResult.data || []) {
            const postId = Number(like.post_id);
            likesByPost.set(postId, (likesByPost.get(postId) || 0) + 1);
            if (account && String(like.wallet_address || "").toLowerCase() === account.toLowerCase()) {
              likedByMe.add(postId);
            }
          }

          const repostsByPost = new Map();
          const repostedByMe = new Set();

          for (const repost of repostsResult.data || []) {
            const postId = Number(repost.post_id);
            repostsByPost.set(postId, (repostsByPost.get(postId) || 0) + 1);
            if (account && String(repost.wallet_address || "").toLowerCase() === account.toLowerCase()) {
              repostedByMe.add(postId);
            }
          }

          formattedMessages.forEach((message) => {
            message.likeCount = likesByPost.get(message.id) || 0;
            message.repostCount = repostsByPost.get(message.id) || 0;
            message.liked = likedByMe.has(message.id);
            message.reposted = repostedByMe.has(message.id);
          });
        } catch (socialError) {
          console.warn("[ChainWall] Supabase social data load failed:", socialError);
        }
      }

      // Load comments from Supabase only. Comments are application data, not
      // blockchain transactions.
      const commentsByMessage = {};

      if (supabase) {
        try {
          const { data: dbComments, error: dbCommentsError } = await supabase
            .from("comments")
            .select("id, post_id, wallet_address, content, created_at")
            .order("created_at", { ascending: true });

          if (dbCommentsError) {
            console.warn("[ChainWall] Supabase comments read failed:", dbCommentsError);
          } else {
            for (const comment of dbComments || []) {
              const messageId = Number(comment.post_id);
              const sender = comment.wallet_address || "";

              if (!commentsByMessage[messageId]) {
                commentsByMessage[messageId] = [];
              }

              const cachedProfile = loadProfile(sender);

              commentsByMessage[messageId].push({
                id: Number(comment.id),
                messageId,
                sender,
                username:
                  cachedProfile?.username ||
                  formatAddress(sender) ||
                  "ChainWall User",
                content: comment.content || "",
                timestamp: Math.floor(new Date(comment.created_at).getTime() / 1000),
                deleted: false,
              });
            }

            Object.values(commentsByMessage).forEach((list) => {
              list.sort((a, b) => a.timestamp - b.timestamp);
            });

            formattedMessages.forEach((message) => {
              message.commentCount = commentsByMessage[message.id]?.length || 0;
            });
          }
        } catch (dbError) {
          console.warn("[ChainWall] Supabase comments load failed:", dbError);
        }
      }

      setMessages(formattedMessages);

      const onChainLikes = formattedMessages
        .filter((message) => message.liked)
        .map((message) => message.id);

      const onChainReposts = formattedMessages
        .filter((message) => message.reposted)
        .map((message) => message.id);

      const updatedSocialData = {
        likes: onChainLikes,
        reposts: onChainReposts,
        comments: commentsByMessage,
      };

      setSocialData(updatedSocialData);

      if (account) {
        saveSocialData(account, updatedSocialData);
      }

      console.log(
        `[ChainWall] Feed loaded successfully: ${formattedMessages.length}/${total} messages`
      );
    } catch (err) {
      console.error("[ChainWall] loadMessages failed:", err);

      setMessages([]);

      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Unable to load messages. Please check that MetaMask is connected to Arc Testnet."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  /* =====================================================
     GLOBAL WALL MODERATION / EDITING
  ===================================================== */

  async function editMessage(messageId, newContent) {
    const trimmed = newContent.trim();

    if (!account) {
      setError("Connect your wallet first.");
      return false;
    }

    if (!trimmed) {
      setError("Message cannot be empty.");
      return false;
    }

    const existingMedia = parsePostContent(
      editingMessage?.content || ""
    ).imageUrl;

    const updatedContent = buildPostContent(
      trimmed,
      existingMedia
    );

    if (updatedContent.length > 500) {
      setError("Message cannot be longer than 500 characters.");
      return false;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("Waiting for the edit transaction...");

      const contract = await getContract(true);
      const transaction = await contract.editMessage(messageId, updatedContent);
      await transaction.wait();

      setEditingMessage(null);
      setEditDraft("");
      await loadMessages();
      setSuccess("Message edited successfully.");
      return true;
    } catch (err) {
      console.error(err);
      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Unable to edit this message."
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteMessage(messageId) {
    if (!account) {
      setError("Connect your wallet first.");
      return false;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("Waiting for the delete transaction...");

      const contract = await getContract(true);
      const transaction = await contract.deleteMessage(messageId);
      await transaction.wait();

      await loadMessages();
      setSuccess("Message deleted. The on-chain record remains, but the post is now marked as deleted.");
      return true;
    } catch (err) {
      console.error(err);
      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Unable to delete this message."
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function reportMessage(messageId, reason) {
    if (!account) {
      setError("Connect your wallet first.");
      return false;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("Waiting for the report transaction...");

      const contract = await getContract(true);
      const transaction = await contract.reportMessage(messageId, reason);
      await transaction.wait();

      await loadMessages();
      setSuccess("Report submitted on-chain. Thanks for helping keep ChainWall clean.");
      return true;
    } catch (err) {
      console.error(err);
      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Unable to submit this report."
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  /* =====================================================
     POST IMAGE
  ===================================================== */

  function handlePostImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setError("");
    setPostImageFile(file);

    const reader = new FileReader();
    reader.onload = () => setPostImagePreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function removePostImage() {
    setPostImageFile(null);
    setPostImagePreview("");
  }

  async function uploadPostImage() {
    if (!postImageFile) return "";

    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
      );
    }

    const extension =
      postImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const walletFolder = (account || "anonymous").toLowerCase();
    const uniqueName =
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const path = `${walletFolder}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(POST_IMAGE_BUCKET)
      .upload(path, postImageFile, {
        contentType: postImageFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Image upload failed. Make sure the public "${POST_IMAGE_BUCKET}" bucket exists in Supabase. ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from(POST_IMAGE_BUCKET)
      .getPublicUrl(path);

    return data?.publicUrl || "";
  }

  /* =====================================================
     POST MESSAGE
  ===================================================== */

  async function postMessage(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!account) {
      setError("Please connect your wallet first.");
      return;
    }

    if (!profile) {
      setError("Please create your profile first.");
      setPage("profile");
      return;
    }

    const message = content.trim();

    if (!message && !postImageFile) {
      setError("Write a message or add an image.");
      return;
    }

    if (message.length > 500) {
      setError("Message cannot be longer than 500 characters.");
      return;
    }

    try {
      setLoading(true);

      let imageUrl = "";
      if (postImageFile) {
        setSuccess("Uploading image...");
        imageUrl = await uploadPostImage();
      }

      const onChainContent = buildPostContent(message, imageUrl);

      if (onChainContent.length > 500) {
        setError(
          "The message plus image reference is too long. Shorten the message or use a smaller filename."
        );
        return;
      }

      const contract = await getContract(true);

      const transaction = await contract.postMessage(
        profile.username,
        onChainContent
      );

      setSuccess(
        "Waiting for blockchain confirmation..."
      );

      const receipt = await transaction.wait();

      setTransactionHash(
        receipt?.hash ||
          transaction?.hash ||
          ""
      );

      setContent("");
      removePostImage();

      await loadMessages();

      setSuccess(
        "Your message was posted successfully!"
      );

      setPage("success");
    } catch (err) {
      console.error(err);

      if (err?.code === 4001) {
        setError(
          "Transaction was rejected in your wallet."
        );
      } else {
        setError(
          err?.reason ||
            err?.shortMessage ||
            err?.message ||
            "Transaction failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     LIKE
  ===================================================== */

  async function toggleLike(messageId) {
    if (!account) {
      setError("Connect your wallet to like posts.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured. Please check your .env file.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const message = messages.find((item) => item.id === messageId);
      const alreadyLiked = Boolean(message?.liked);
      const nowLiked = !alreadyLiked;

      await syncLikeToSupabase(messageId, account, nowLiked);

      if (nowLiked && message?.sender) {
        await createSupabaseNotification({
          recipientWallet: message.sender,
          senderWallet: account,
          type: "like",
          postId: messageId,
        });
      }

      await loadMessages();
      setSuccess(nowLiked ? "Post liked." : "Post unliked.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to update like in Supabase."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =====================================================
     REPOST
  ===================================================== */

  async function toggleRepost(messageId) {
    if (!account) {
      setError("Connect your wallet to repost.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured. Please check your .env file.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const message = messages.find((item) => item.id === messageId);
      const alreadyReposted = Boolean(message?.reposted);
      const nowReposted = !alreadyReposted;

      await syncRepostToSupabase(messageId, account, nowReposted);

      if (nowReposted && message?.sender) {
        await createSupabaseNotification({
          recipientWallet: message.sender,
          senderWallet: account,
          type: "repost",
          postId: messageId,
        });
      }

      await loadMessages();

      setSuccess(nowReposted ? "Post reposted." : "Repost removed.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to update repost in Supabase."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =====================================================
     COMMENTS
  ===================================================== */

  function updateCommentInput(messageId, value) {
    setCommentInputs((previous) => ({
      ...previous,
      [messageId]: value,
    }));
  }

  async function addComment(messageId) {
    if (!account) {
      setError("Connect your wallet to comment.");
      return;
    }

    if (!profile) {
      setError("Create your profile first.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured. Please check your .env file.");
      return;
    }

    const text = (commentInputs[messageId] || "").trim();

    if (!text) return;

    if (text.length > 500) {
      setError("Comment cannot be longer than 500 characters.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      await syncCommentToSupabase(messageId, account, text);

      const post = messages.find((item) => item.id === messageId);

      if (post?.sender) {
        await createSupabaseNotification({
          recipientWallet: post.sender,
          senderWallet: account,
          type: "comment",
          postId: messageId,
        });
      }

      await loadMessages();

      setCommentInputs((previous) => ({
        ...previous,
        [messageId]: "",
      }));

      setSuccess("Comment added.");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to add comment to Supabase."
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function openGlobal() {
    setError("");
    setSuccess("");
    setPage("global");
  }

  function openDashboard() {
    setError("");
    setSuccess("");

    if (!account) {
      setWalletModalOpen(true);
      return;
    }

    if (!profile) {
      setPage("profile");
      return;
    }

    setPage("dashboard");
  }

  function openProfile() {
    setError("");
    setSuccess("");

    if (!account) {
      setWalletModalOpen(true);
      return;
    }

    setUsernameInput(profile?.username || "");
    setBioInput(profile?.bio || "");
    setAvatarInput(profile?.avatar || "");
    setPage("profile");
  }

  function openCompose() {
    setError("");
    setSuccess("");

    if (!account) {
      setError("Connect your wallet first.");
      return;
    }

    if (!profile) {
      setPage("profile");
      return;
    }

    setPage("compose");
  }

  function goHome() {
    setError("");
    setSuccess("");
    setPage("landing");
  }

  function openWalletModal() {
    setError("");
    setSuccess("");

    const fallbackWallets = getFallbackWalletOptions();

    setWalletOptions((current) =>
      dedupeWallets([...current, ...fallbackWallets])
    );

    setWalletModalOpen(true);
  }

  /* =====================================================
     WALLET DISCOVERY (EIP-6963 + injected fallback)
  ===================================================== */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const discovered = new Map();

    const publish = () => {
      setWalletOptions(dedupeWallets(Array.from(discovered.values())));
    };

    const handleAnnouncement = (event) => {
      const detail = event?.detail;
      const info = detail?.info;
      const provider = detail?.provider;

      if (!info?.uuid || !provider) return;

      discovered.set(info.uuid, { info, provider });
      publish();
    };

    window.addEventListener(
      "eip6963:announceProvider",
      handleAnnouncement
    );

    window.dispatchEvent(
      new Event("eip6963:requestProvider")
    );

    // Older extensions may expose multiple providers without EIP-6963.
    const legacyProviders = getFallbackWalletOptions();

    legacyProviders.forEach((wallet) => {
      discovered.set(wallet.info.uuid, wallet);
    });

    publish();

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnouncement
      );
    };
  }, []);

  /* =====================================================
     INITIAL WALLET CHECK
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        if (!window.ethereum) return;

        const provider = getProvider();

        const accounts = await provider.send(
          "eth_accounts",
          []
        );

        if (
          !mounted ||
          !accounts ||
          accounts.length === 0
        ) {
          return;
        }

        const connectedAccount = accounts[0];

        const existingProfile =
          await loadProfileFromSupabase(connectedAccount);

        setAccount(connectedAccount);
        setSocialData(
          loadSocialData(connectedAccount)
        );

        // Keep the current page when the app detects an already-connected wallet.
        // In particular, refreshing Home must not force the user into Dashboard/Profile.
        if (existingProfile) {
          setProfile(existingProfile);
          setAvatarInput(existingProfile.avatar || "");
        } else {
          setProfile(null);
          setAvatarInput("");
        }
      } catch (err) {
        console.error(err);
      }
    }

    start();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     ACCOUNT CHANGE
  ===================================================== */

  useEffect(() => {
    if (!window.ethereum) return;

    async function handleAccountsChanged(accounts) {
      if (
        !accounts ||
        accounts.length === 0
      ) {
        setAccount("");
        setProfile(null);
        setMessages([]);
        setPage("landing");

        setSocialData({
          likes: [],
          reposts: [],
          comments: {},
        });

        return;
      }

      const nextAccount = accounts[0];

      const existingProfile =
        await loadProfileFromSupabase(nextAccount);

      setAccount(nextAccount);
      setSocialData(
        loadSocialData(nextAccount)
      );

      setError("");
      setSuccess("");

      // Do not redirect on wallet/account changes. The user stays on the page
      // they are currently viewing and can navigate explicitly.
      if (existingProfile) {
        setProfile(existingProfile);
        setAvatarInput(existingProfile.avatar || "");
      } else {
        setProfile(null);
        setUsernameInput("");
        setBioInput("");
        setAvatarInput("");
      }
    }

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, []);

  /* =====================================================
     LOAD GLOBAL FEED
  ===================================================== */

  useEffect(() => {
    if (
      (page === "global" || page === "dashboard") &&
      account &&
      profile
    ) {
      loadMessages();
    }
  }, [page, account, profile]);

  /* =====================================================
     APP RENDER
  ===================================================== */

  return (
    <>
      <WalletModal
        open={walletModalOpen}
        wallets={walletOptions}
        onClose={() => setWalletModalOpen(false)}
        onSelect={connectWallet}
      />

      {page === "profile" && (
        <ProfilePage
          account={account}
          profile={profile}
          usernameInput={usernameInput}
          setUsernameInput={setUsernameInput}
          bioInput={bioInput}
          setBioInput={setBioInput}
          avatarInput={avatarInput}
          handleAvatarUpload={handleAvatarUpload}
          removeAvatar={removeAvatar}
          error={error}
          success={success}
          createProfile={createProfile}
          goHome={goHome}
          formatAddress={formatAddress}
          disconnectWallet={disconnectWallet}
        />
      )}

      {page === "dashboard" && (
        <DashboardPage
          account={account}
          profile={profile}
          messages={messages}
          loadingHistory={loadingHistory}
          error={error}
          success={success}
          socialData={socialData}
          commentInputs={commentInputs}
          setCommentInputs={setCommentInputs}
          toggleLike={toggleLike}
          toggleRepost={toggleRepost}
          updateCommentInput={updateCommentInput}
          addComment={addComment}
          loadMessages={loadMessages}
          openCompose={openCompose}
          openGlobal={openGlobal}
          openDashboard={openDashboard}
          openProfile={openProfile}
          openWalletModal={openWalletModal}
          goHome={goHome}
          disconnectWallet={disconnectWallet}
          formatAddress={formatAddress}
          formatTime={formatTime}
          editMessage={editMessage}
          deleteMessage={deleteMessage}
          reportMessage={reportMessage}
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          actionLoading={actionLoading}
        />
      )}

      {page === "global" && (
        <GlobalPage
          account={account}
          profile={profile}
          messages={messages}
          loadingHistory={loadingHistory}
          error={error}
          success={success}
          socialData={socialData}
          commentInputs={commentInputs}
          setCommentInputs={setCommentInputs}
          toggleLike={toggleLike}
          toggleRepost={toggleRepost}
          updateCommentInput={updateCommentInput}
          addComment={addComment}
          loadMessages={loadMessages}
          openCompose={openCompose}
          openGlobal={openGlobal}
          openDashboard={openDashboard}
          openProfile={openProfile}
          openWalletModal={openWalletModal}
          goHome={goHome}
          disconnectWallet={disconnectWallet}
          formatAddress={formatAddress}
          formatTime={formatTime}
          editMessage={editMessage}
          deleteMessage={deleteMessage}
          reportMessage={reportMessage}
          editingMessage={editingMessage}
          setEditingMessage={setEditingMessage}
          editDraft={editDraft}
          setEditDraft={setEditDraft}
          actionLoading={actionLoading}
        />
      )}

      {page === "compose" && (
        <ComposePage
          account={account}
          profile={profile}
          content={content}
          setContent={setContent}
          loading={loading}
          error={error}
          postMessage={postMessage}
          openGlobal={openGlobal}
          formatAddress={formatAddress}
          postImagePreview={postImagePreview}
          handlePostImageChange={handlePostImageChange}
          removePostImage={removePostImage}
        />
      )}

      {page === "success" && (
        <SuccessPage
          transactionHash={transactionHash}
          openGlobal={openGlobal}
          openCompose={openCompose}
          formatAddress={formatAddress}
        />
      )}

      {page === "landing" && (
        <LandingPage
          account={account}
          profile={profile}
          connectWallet={connectWallet}
          openWalletModal={openWalletModal}
          openGlobal={openGlobal}
          openDashboard={openDashboard}
          openProfile={openProfile}
          goHome={goHome}
        />
      )}
    </>
  );
}

/* =====================================================
   WALLET MODAL
===================================================== */

function WalletModal({ open, wallets, onClose, onSelect }) {
  if (!open) return null;

  const preferred = [
    "MetaMask",
    "OKX Wallet",
    "Coinbase Wallet",
    "Phantom",
    "WalletConnect",
  ];

  const orderedWallets = [...wallets].sort((a, b) => {
    const ai = preferred.indexOf(a.info?.name);
    const bi = preferred.indexOf(b.info?.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="wallet-modal-backdrop" onMouseDown={onClose}>
      <div className="wallet-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="wallet-modal-header">
          <div>
            <h2>Connect Wallet</h2>
            <p>Choose a wallet to continue to ChainWall.</p>
          </div>
          <button className="wallet-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="wallet-list">
          {orderedWallets.map(({ info, provider }) => (
            <button className="wallet-option" key={info.uuid} onClick={() => onSelect(provider)}>
              <span className="wallet-option-icon">
                {info.icon ? <img src={info.icon} alt="" /> : (info.name || "W").charAt(0)}
              </span>
              <span className="wallet-option-copy">
                <strong>{info.name || "Browser Wallet"}</strong>
                <small>Installed</small>
              </span>
              <span className="wallet-option-arrow">›</span>
            </button>
          ))}

          <button
            className="wallet-option wallet-option-muted"
            type="button"
            onClick={() =>
              window.open(
                "https://walletconnect.com/explorer",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <span className="wallet-option-icon walletconnect-icon">
              W
            </span>
            <span className="wallet-option-copy">
              <strong>WalletConnect</strong>
              <small>QR wallet discovery</small>
            </span>
            <span className="wallet-option-arrow">›</span>
          </button>

          <button className="wallet-option wallet-search-option" type="button" onClick={onClose}>
            <span className="wallet-search-icon">⌕</span>
            <span className="wallet-option-copy">
              <strong>Search Wallet</strong>
              <small>More installed wallets</small>
            </span>
            <span className="wallet-option-arrow">›</span>
          </button>
        </div>

        <div className="wallet-modal-footer">
          <span>By connecting, you agree to use ChainWall with your selected wallet.</span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   LANDING PAGE
   IMPORTANT:
   These components are OUTSIDE App().
   This prevents input elements from being remounted
   during every App state update.
===================================================== */

function LandingPage({
  account,
  profile,
  connectWallet,
  openWalletModal,
  openGlobal,
  openDashboard,
  openProfile,
  goHome,
}) {
  return (
    <div className="page-shell">
      <header className="top-nav">
        <button
          className="brand-button"
          onClick={goHome}
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>

            <small>
              WORDS. ON-CHAIN.
            </small>
          </span>
        </button>

        <nav className="desktop-nav app-desktop-nav landing-nav-links">
          <button onClick={goHome}>Home</button>
          <button onClick={openDashboard}>Dashboard</button>
          <button onClick={() => { window.open("https://faucet.circle.com/?allow=true", "_blank", "noopener,noreferrer"); }}>Faucet</button>
          <button onClick={openProfile}>Profile</button>
        </nav>

        {account ? (
          <button
            className="nav-wallet-connected"
            onClick={openProfile}
            title="Open your profile"
          >
            <span className="nav-wallet-avatar">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                />
              ) : (
                <span>
                  {(profile?.username || account.slice(2, 3) || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="nav-wallet-copy">
              <strong>
                {profile?.username || "Connected"}
              </strong>
              <small>
                {formatAddress(account)}
              </small>
            </span>
            <span className="nav-wallet-arrow">→</span>
          </button>
        ) : (
          <button
            className="nav-wallet-btn"
            onClick={openWalletModal}
          >
            Connect Wallet
          </button>
        )}
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-glow" />

          <div className="hero-badge">
            <span className="live-dot" />
            Built on Arc
          </div>

          <h1>
            Your words.
            <br />
            <span>
              Permanent on-chain.
            </span>
          </h1>

          <p>
            A decentralized public wall where every
            message becomes part of the blockchain.
          </p>

          <div className="hero-actions">
            <button
              className={`primary-btn hero-wallet-btn ${
                account ? "hero-wallet-connected" : ""
              }`}
              onClick={() => {
                if (account) {
                  openProfile();
                } else {
                  openWalletModal();
                }
              }}
              title={
                account
                  ? "Wallet connected — click to open Profile"
                  : "Connect your wallet"
              }
            >
              {account ? (
                <>
                  <span className="hero-wallet-status">
                    <span className="hero-wallet-dot" />
                    Wallet Connected
                  </span>
                  <small className="hero-wallet-address">
                    {formatAddress(account)}
                  </small>
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>Connect Wallet</span>
                  <span>→</span>
                </>
              )}
            </button>

            <button
              className="secondary-btn"
              onClick={() => {
                if (account && profile) {
                  openGlobal();
                } else {
                  openWalletModal();
                }
              }}
            >
              Explore Global Wall
            </button>
          </div>
        </section>

        <section className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              ✦
            </div>

            <h3>
              On-chain Messages
            </h3>

            <p>
              Your message is permanently recorded
              on the Arc blockchain.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              ◈
            </div>

            <h3>
              Wallet Identity
            </h3>

            <p>
              Your wallet becomes your identity
              inside ChainWall.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              ↗
            </div>

            <h3>
              Global Wall
            </h3>

            <p>
              Discover messages posted by people
              across the network.
            </p>
          </div>
        </section>

        <section className="showcase-section">
          <div className="section-heading">
            <span>THE IDEA</span>

            <h2>
              Simple to use.
              <br />
              <em>
                Built differently.
              </em>
            </h2>

            <p>
              Connect your wallet, create your identity,
              and share your thoughts with the world.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span>01</span>
              <h3>Connect</h3>
              <p>
                Connect your compatible wallet to
                ChainWall.
              </p>
            </div>

            <div className="step-card">
              <span>02</span>
              <h3>Create</h3>
              <p>
                Set your ChainWall username and profile.
              </p>
            </div>

            <div className="step-card">
              <span>03</span>
              <h3>Write</h3>
              <p>
                Publish a message directly on-chain.
              </p>
            </div>

            <div className="step-card">
              <span>04</span>
              <h3>Share</h3>
              <p>
                Let the global community discover it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>ChainWall</strong>
          <span>
            Decentralized Message Wall
          </span>
        </div>

        <span>
          Built on Arc Network
        </span>
      </footer>
    </div>
  );
}

/* =====================================================
   PROFILE PAGE
===================================================== */

function ProfilePage({
  account,
  profile,
  usernameInput,
  setUsernameInput,
  bioInput,
  setBioInput,
  avatarInput,
  handleAvatarUpload,
  removeAvatar,
  error,
  success,
  createProfile,
  goHome,
  formatAddress,
  disconnectWallet,
}) {
  const displayName =
    usernameInput ||
    profile?.username ||
    "ChainWall User";

  return (
    <div className="app-page profile-settings-page">
      <header className="app-nav profile-settings-nav">
        <button
          className="brand-button"
          onClick={goHome}
          aria-label="Back to Home"
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>

            <small>
              YOUR IDENTITY
            </small>
          </span>
        </button>

        <button
          type="button"
          className="page-back-btn"
          onClick={goHome}
        >
          <span>←</span>
          Back
        </button>

        <div className="nav-account profile-nav-account">
          <span className="connected-dot" />
          {formatAddress(account)}
        </div>
      </header>

      <main className="profile-settings-shell">
        <section className="profile-settings-header">
          <div>
            <span className="eyebrow">
              PROFILE SETTINGS
            </span>

            <h1>
              {profile
                ? "Edit your profile"
                : "Create your profile"}
            </h1>

            <p>
              Manage the identity people see across ChainWall.
            </p>
          </div>

          <div className="profile-network-badge">
            <span className="connected-dot" />
            <div>
              <small>NETWORK</small>
              <strong>Arc Testnet</strong>
            </div>
          </div>
        </section>

        {error && (
          <div className="alert error profile-alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success profile-alert">
            {success}
          </div>
        )}

        <div className="profile-settings-grid">
          <section className="profile-settings-card profile-identity-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-kicker">
                  PROFILE PICTURE
                </span>
                <h2>Your identity</h2>
              </div>
            </div>

            <div className="profile-avatar-stage">
              <Avatar
                src={avatarInput}
                name={displayName}
                large
              />
              <div className="profile-avatar-ring" />
            </div>

            <div className="profile-avatar-name">
              <strong>{displayName}</strong>
              <span>{formatAddress(account)}</span>
            </div>

            <p className="settings-help">
              Use a custom image or let ChainWall generate an avatar
              from your username.
            </p>

            <div className="profile-picture-actions">
              <label className="profile-action-btn profile-upload-btn">
                Upload Picture
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  hidden
                />
              </label>

              <button
                type="button"
                className="profile-action-btn profile-generated-btn"
                onClick={() => {
                  removeAvatar();
                }}
                disabled={!avatarInput}
              >
                Use Generated Avatar
              </button>

              <button
                type="button"
                className="profile-remove-picture-btn"
                onClick={removeAvatar}
                disabled={!avatarInput}
              >
                Remove Profile Picture
              </button>
            </div>

            <div className="profile-picture-note">
              <span>JPG, PNG, WEBP or GIF</span>
              <span>Max 2 MB</span>
            </div>
          </section>

          <section className="profile-settings-card profile-info-card">
            <div className="settings-card-heading">
              <div>
                <span className="settings-kicker">
                  PUBLIC PROFILE
                </span>
                <h2>Profile information</h2>
              </div>
            </div>

            <form onSubmit={createProfile}>
              <label htmlFor="chainwall-username">
                Username
              </label>

              <input
                id="chainwall-username"
                type="text"
                value={usernameInput}
                onChange={(event) => {
                  setUsernameInput(event.target.value);
                }}
                placeholder="Choose your username"
                maxLength={30}
                autoComplete="off"
                spellCheck={false}
              />

              <div className="field-meta">
                <span>Your public ChainWall name</span>
                <span>{usernameInput.length}/30</span>
              </div>

              <label htmlFor="chainwall-bio">
                Bio
                <span>optional</span>
              </label>

              <textarea
                id="chainwall-bio"
                value={bioInput}
                onChange={(event) => {
                  setBioInput(event.target.value);
                }}
                placeholder="Tell the world a little about you..."
                maxLength={160}
              />

              <div className="field-meta">
                <span>Shown on your profile</span>
                <span>{bioInput.length}/160</span>
              </div>

              <div className="profile-save-row">
                <button
                  className="primary-btn full-btn"
                  type="submit"
                >
                  {profile
                    ? "Save Changes"
                    : "Create Profile"}
                  <span>→</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="profile-settings-card profile-wallet-card">
          <div className="wallet-card-left">
            <div className="wallet-card-icon">
              ◇
            </div>

            <div>
              <span className="settings-kicker">
                CONNECTED WALLET
              </span>
              <h2>{formatAddress(account)}</h2>
              <p>
                This wallet is your ChainWall on-chain identity.
              </p>
            </div>
          </div>

          <div className="wallet-card-right">
            <span className="wallet-network-pill">
              <span className="connected-dot" />
              Arc Testnet
            </span>

            <button
              className="disconnect-profile"
              type="button"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/* =====================================================
   GLOBAL PAGE
===================================================== */

function DashboardPage({
  account,
  profile,
  messages,
  loadingHistory,
  error,
  success,
  socialData,
  commentInputs,
  setCommentInputs,
  toggleLike,
  toggleRepost,
  updateCommentInput,
  addComment,
  loadMessages,
  openCompose,
  openGlobal,
  openDashboard,
  openProfile,
  openWalletModal,
  goHome,
  disconnectWallet,
  formatAddress,
  formatTime,
  editMessage,
  deleteMessage,
  reportMessage,
  editingMessage,
  setEditingMessage,
  editDraft,
  setEditDraft,
  actionLoading,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [reportReason, setReportReason] = useState("Spam");

  function getComments(messageId) {
    return socialData.comments?.[messageId] || [];
  }

  const yourMessages = messages.filter(
    (message) =>
      message.sender?.toLowerCase() === account?.toLowerCase()
  );

  const recentMessages = [...yourMessages].slice(0, 5);

  const recentActivity = messages.filter((message) => {
    const age = Date.now() / 1000 - Number(message.timestamp || 0);
    return age >= 0 && age <= 7 * 24 * 60 * 60;
  }).length;

  return (
    <div className="app-page dashboard-page">
      <header className="app-nav dashboard-nav">
        <button className="brand-button" onClick={goHome}>
          <span className="brand-mark">C</span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>
            <small>ON-CHAIN SOCIAL</small>
          </span>
        </button>

        <nav className="desktop-nav app-desktop-nav">
          <button onClick={goHome}>Home</button>
          <button className="active" onClick={openDashboard}>Dashboard</button>
          <button onClick={openGlobal}>Global Wall</button>
          <button
            onClick={() => {
              window.open("https://faucet.circle.com/?allow=true", "_blank", "noopener,noreferrer");
            }}
          >
            Faucet
          </button>
          <button onClick={openProfile}>Profile</button>
        </nav>

        <div className="nav-right systematic-wallet">
          <div className="profile-mini profile-mini-stack">
            <Avatar
              src={profile?.avatar}
              name={profile?.username || "ChainWall"}
              className="mini-avatar"
            />
            <strong>{profile?.username || "User"}</strong>
          </div>

          <div className="wallet-controls">
            <span className="wallet-address">{formatAddress(account)}</span>
            <button
              className="disconnect-small"
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-container">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <section className="dashboard-welcome">
          <div>
            <span className="eyebrow">CHAINWALL DASHBOARD</span>
            <h1>
              Welcome back,
              <br />
              <span>{profile?.username || "Builder"}.</span>
            </h1>
            <p>
              Your on-chain identity and the latest activity from the global wall,
              all in one place.
            </p>
          </div>

          <div className="dashboard-network-card">
            <span className="network-pulse" />
            <div>
              <small>NETWORK</small>
              <strong>Arc Testnet</strong>
            </div>
            <span className="network-live">LIVE</span>
          </div>
        </section>

        <section className="dashboard-stats">
          <article className="dashboard-stat-card">
            <span>Total posts</span>
            <strong>{messages.length}</strong>
            <small>Global ChainWall</small>
          </article>

          <article className="dashboard-stat-card accent">
            <span>Your posts</span>
            <strong>{yourMessages.length}</strong>
            <small>Published by you</small>
          </article>

          <article className="dashboard-stat-card">
            <span>7-day activity</span>
            <strong>{recentActivity}</strong>
            <small>Recent on-chain posts</small>
          </article>

          <article className="dashboard-stat-card wallet-stat">
            <span>Connected wallet</span>
            <strong>{formatAddress(account)}</strong>
            <small>Arc Testnet</small>
          </article>
        </section>

        <section className="dashboard-main-grid">
          <div className="dashboard-feed-panel">
            <div className="dashboard-panel-heading">
              <div>
                <span className="eyebrow">YOUR ACTIVITY</span>
                <h2>Your latest posts</h2>
              </div>

              <button
                className="refresh-button"
                onClick={loadMessages}
                disabled={loadingHistory}
              >
                {loadingHistory ? "Loading..." : "↻ Refresh"}
              </button>
            </div>

            {loadingHistory && messages.length === 0 ? (
              <div className="loading-state dashboard-loading">
                <div className="loader" />
                <p>Loading the global wall...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state dashboard-empty">
                <div>◌</div>
                <h2>No messages yet</h2>
                <p>Be the first person to put a word on-chain.</p>
                <button className="primary-btn" onClick={openCompose}>
                  Write the first message →
                </button>
              </div>
            ) : (
              <div className="dashboard-post-list">
                {recentMessages.map((message) => {
                  const liked = socialData.likes.includes(message.id);
                  const reposted = socialData.reposts.includes(message.id);
                  const comments = getComments(message.id);

                  return (
                    <article className="dashboard-post" key={message.id}>
                      <div className="dashboard-post-top">
                        <div className="post-user">
                          <Avatar
                            name={message.username || "C"}
                            className="dashboard-post-avatar"
                          />
                          <div className="post-user-info">
                            <strong>{message.username || "Anonymous"}</strong>
                            <span>{formatAddress(message.sender)}</span>
                          </div>
                        </div>

                        <div className="dashboard-post-head-actions">
                          <span className="dashboard-post-id">
                            #{message.id}
                          </span>

                          <div className="post-menu-wrap">
                            <button
                              type="button"
                              className="post-menu-button"
                              aria-label="Post options"
                              aria-expanded={openMenuId === message.id}
                              onClick={() =>
                                setOpenMenuId((current) =>
                                  current === message.id ? null : message.id
                                )
                              }
                            >
                              ⋯
                            </button>

                            {openMenuId === message.id && (
                              <div className="post-menu dashboard-post-menu">
                                {message.sender?.toLowerCase() === account?.toLowerCase() &&
                                  !message.deleted && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={
                                          actionLoading ||
                                          Date.now() / 1000 - message.timestamp > 15 * 60
                                        }
                                        onClick={() => {
                                          const age = Date.now() / 1000 - message.timestamp;
                                          if (age > 15 * 60) return;
                                          setEditDraft(parsePostContent(message.content).text);
                                          setEditingMessage(message);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        <span>✎</span>
                                        {Date.now() / 1000 - message.timestamp <= 15 * 60
                                          ? `Edit · ${Math.max(1, Math.ceil((15 * 60 - (Date.now() / 1000 - message.timestamp)) / 60))}m left`
                                          : "Edit · expired"}
                                      </button>

                                      <button
                                        type="button"
                                        className="danger"
                                        disabled={actionLoading}
                                        onClick={async () => {
                                          setOpenMenuId(null);
                                          const confirmed = window.confirm(
                                            "Delete this post? It will be marked as deleted on-chain."
                                          );
                                          if (confirmed) {
                                            await deleteMessage(message.id);
                                          }
                                        }}
                                      >
                                        <span>⌫</span>
                                        Delete post
                                      </button>
                                    </>
                                  )}

                                {!message.deleted && (
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => {
                                      setReportReason("Spam");
                                      setReportingMessage(message);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <span>⚑</span>
                                    Report post
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const media = parsePostContent(message.content);
                        return (
                          <>
                            <p className={`dashboard-post-content ${message.deleted ? "post-body-deleted" : ""}`}>
                              {message.deleted
                                ? "This message was deleted by the author."
                                : media.text}
                            </p>
                            {!message.deleted && media.imageUrl && (
                              <img
                                className="post-media-image dashboard-media-image"
                                src={media.imageUrl}
                                alt="Post attachment"
                                loading="lazy"
                              />
                            )}
                          </>
                        );
                      })()}

                      <div className="dashboard-post-meta">
                        <span>
                          {formatTime(message.timestamp)}
                          {message.editedAt > 0 && !message.deleted && " · edited"}
                        </span>
                        <span className="onchain-badge">● ON-CHAIN</span>
                      </div>

                      <div className="post-actions dashboard-actions">
                        <button
                          className={liked ? "action active" : "action"}
                          onClick={() => toggleLike(message.id)}
                        >
                          <span>{liked ? "♥" : "♡"}</span>
                          {liked ? "Liked" : "Like"}{message.likeCount > 0 && ` ${message.likeCount}`}
                        </button>

                        <button
                          className={
                            comments.length > 0 ? "action active" : "action"
                          }
                          onClick={() => {
                            document
                              .getElementById(`comment-${message.id}`)
                              ?.focus();
                          }}
                        >
                          <span>◌</span>
                          Comment{message.commentCount > 0 && ` ${message.commentCount}`}
                        </button>

                        <button
                          className={reposted ? "action active" : "action"}
                          onClick={() => toggleRepost(message.id)}
                        >
                          <span>↻</span>
                          {reposted ? "Reposted" : "Repost"}{message.repostCount > 0 && ` ${message.repostCount}`}
                        </button>
                      </div>

                      <div className="comment-area">
                        <input
                          id={`comment-${message.id}`}
                          type="text"
                          value={commentInputs[message.id] || ""}
                          onChange={(event) =>
                            updateCommentInput(message.id, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              addComment(message.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          maxLength={250}
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => addComment(message.id)}
                        >
                          →
                        </button>
                      </div>

                      {comments.length > 0 && (
                        <div className="comments-list">
                          {comments.slice(-3).map((comment) => (
                            <div className="comment" key={comment.id}>
                              <div className="comment-avatar">
                                {(comment.username || "C")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="comment-content">
                                <strong>{comment.username}</strong>
                                <p>{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="dashboard-side">
            <div className="dashboard-identity-card">
              <div className="dashboard-card-glow" />
              <span className="eyebrow">YOUR IDENTITY</span>

              <Avatar
                src={profile?.avatar}
                name={profile?.username || "User"}
                large
                className="dashboard-large-avatar"
              />

              <h2>{profile?.username || "User"}</h2>
              <p>{profile?.bio || "Building a permanent identity on-chain."}</p>

              <div className="identity-wallet">
                <span>Wallet</span>
                <strong>{formatAddress(account)}</strong>
              </div>

              <button className="secondary-btn full-btn" onClick={openProfile}>
                Edit Profile →
              </button>
            </div>

            <div className="dashboard-quick-card">
              <span className="eyebrow">QUICK ACTIONS</span>

              <button onClick={openCompose}>
                <span>✎</span>
                <div>
                  <strong>Post on-chain</strong>
                  <small>Write a new message</small>
                </div>
                <b>→</b>
              </button>

              <button
                onClick={() => {
                  window.open(
                    "https://faucet.circle.com/?allow=true",
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                <span>◆</span>
                <div>
                  <strong>Get testnet funds</strong>
                  <small>Open Arc Faucet</small>
                </div>
                <b>↗</b>
              </button>
            </div>

            <div className="dashboard-status-card">
              <div className="status-row">
                <span className="network-pulse" />
                <div>
                  <strong>Arc Testnet</strong>
                  <small>Connection active</small>
                </div>
                <span className="status-check">✓</span>
              </div>

              <div className="status-row">
                <span className="status-icon">◈</span>
                <div>
                  <strong>On-chain storage</strong>
                  <small>Messages are permanent</small>
                </div>
                <span className="status-check">✓</span>
              </div>
            </div>
          </aside>
        </section>

        {editingMessage && (
          <div className="action-modal-backdrop" onClick={() => !actionLoading && setEditingMessage(null)}>
            <div className="action-modal" onClick={(event) => event.stopPropagation()}>
              <div className="action-modal-heading">
                <div>
                  <span className="eyebrow">EDIT POST</span>
                  <h2>Edit your message</h2>
                  <p>You have 15 minutes from posting to edit the content.</p>
                </div>
                <button type="button" className="action-modal-close" onClick={() => !actionLoading && setEditingMessage(null)}>×</button>
              </div>
              <textarea
                className="action-modal-textarea"
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                maxLength={500}
                autoFocus
                disabled={actionLoading}
              />
              <div className="action-modal-footer">
                <span>{editDraft.length}/500</span>
                <div>
                  <button type="button" className="secondary-btn" onClick={() => !actionLoading && setEditingMessage(null)} disabled={actionLoading}>Cancel</button>
                  <button type="button" className="primary-btn" onClick={() => editMessage(editingMessage.id, editDraft)} disabled={actionLoading || !editDraft.trim()}>
                    {actionLoading ? "Saving..." : "Save edit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportingMessage && (
          <div className="action-modal-backdrop" onClick={() => !actionLoading && setReportingMessage(null)}>
            <div className="action-modal report-modal" onClick={(event) => event.stopPropagation()}>
              <div className="action-modal-heading">
                <div>
                  <span className="eyebrow">COMMUNITY REPORT</span>
                  <h2>Report this post</h2>
                  <p>Choose the reason that best describes the problem.</p>
                </div>
                <button type="button" className="action-modal-close" onClick={() => !actionLoading && setReportingMessage(null)}>×</button>
              </div>
              <div className="report-options">
                {["Spam", "Fraud / Scam", "Harassment", "Suspicious / Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={reportReason === reason ? "report-option active" : "report-option"}
                    onClick={() => setReportReason(reason)}
                    disabled={actionLoading}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="action-modal-footer">
                <span>Reports are recorded on-chain.</span>
                <div>
                  <button type="button" className="secondary-btn" onClick={() => !actionLoading && setReportingMessage(null)} disabled={actionLoading}>Cancel</button>
                  <button
                    type="button"
                    className="primary-btn report-submit"
                    onClick={async () => {
                      const submitted = await reportMessage(reportingMessage.id, reportReason);
                      if (submitted) setReportingMessage(null);
                    }}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Submitting..." : "Submit report"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length > 5 && (
          <button className="dashboard-view-all" onClick={openGlobal}>
            View all {messages.length} posts →
          </button>
        )}
      </main>

      <button
        className="compose-floating"
        onClick={openCompose}
        aria-label="Write a message"
        type="button"
      >
        <span>✎</span>
      </button>
    </div>
  );
}

function GlobalPage({
  account,
  profile,
  messages,
  loadingHistory,
  error,
  success,
  socialData,
  commentInputs,
  setCommentInputs,
  toggleLike,
  toggleRepost,
  updateCommentInput,
  addComment,
  loadMessages,
  openCompose,
  openGlobal,
  openDashboard,
  openProfile,
  openWalletModal,
  goHome,
  disconnectWallet,
  formatAddress,
  formatTime,
  editMessage,
  deleteMessage,
  reportMessage,
  editingMessage,
  setEditingMessage,
  editDraft,
  setEditDraft,
  actionLoading,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [reportReason, setReportReason] = useState("Spam");

  function getComments(messageId) {
    return (
      socialData.comments?.[messageId] ||
      []
    );
  }

  return (
    <div className="app-page">
      <header className="app-nav">
        <button
          className="brand-button"
          onClick={goHome}
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>

            <small>
              GLOBAL WALL
            </small>
          </span>
        </button>

        <nav className="desktop-nav app-desktop-nav">
          <button onClick={goHome}>Home</button>
          <button onClick={openDashboard}>Dashboard</button>
          <button className="active" onClick={openGlobal}>Global Wall</button>
          <button onClick={() => { window.open("https://faucet.circle.com/?allow=true", "_blank", "noopener,noreferrer"); }}>Faucet</button>
          <button onClick={openProfile}>Profile</button>
        </nav>

        <div className="nav-right systematic-wallet">
          <div className="profile-mini profile-mini-stack">
            <Avatar
              src={profile?.avatar}
              name={profile?.username || "ChainWall"}
              className="mini-avatar"
            />
            <strong>{profile?.username || "User"}</strong>
          </div>

          <div className="wallet-controls">
            <span className="wallet-address">{formatAddress(account)}</span>
            <button className="disconnect-small" onClick={disconnectWallet}>
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="feed-container">
        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success">
            {success}
          </div>
        )}

        <section className="feed-hero">
          <div>
            <span className="eyebrow">
              GLOBAL WALL
            </span>

            <h1>
              What's happening
              <br />
              <span>
                on-chain.
              </span>
            </h1>

            <p>
              Messages from the ChainWall community.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadMessages}
            disabled={loadingHistory}
          >
            {loadingHistory
              ? "Loading..."
              : "↻ Refresh"}
          </button>
        </section>

        {loadingHistory &&
        messages.length === 0 ? (
          <div className="loading-state">
            <div className="loader" />

            <p>
              Loading the global wall...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div>◌</div>

            <h2>
              No messages yet
            </h2>

            <p>
              Be the first person to put a word
              on-chain.
            </p>

            <button
              className="primary-btn"
              onClick={openCompose}
            >
              Write the first message →
            </button>
          </div>
        ) : (
          <section id="history" className="feed-list">
            {messages.map((message) => {
              const liked =
                socialData.likes.includes(
                  message.id
                );

              const reposted =
                socialData.reposts.includes(
                  message.id
                );

              const comments =
                getComments(message.id);

              return (
                <article
                  className="post-card-new"
                  key={message.id}
                >
                  <div className="post-header">
                    <div className="post-user">
                      <Avatar
                        src={
                          message.sender?.toLowerCase() ===
                          account?.toLowerCase()
                            ? profile?.avatar
                            : loadProfile(message.sender)?.avatar
                        }
                        name={message.username || "ChainWall"}
                      />

                      <div className="post-user-info">
                        <strong>{message.username || "Anonymous"}</strong>
                        <span className="post-wallet-line">
                          {formatAddress(message.sender)}
                        </span>
                      </div>
                    </div>

                    <div className="post-header-right">
                      <span className="post-number">#{message.id}</span>

                      <div className="post-menu-wrap">
                        <button
                          type="button"
                          className="post-menu-button"
                          aria-label="Post options"
                          aria-expanded={openMenuId === message.id}
                          onClick={() =>
                            setOpenMenuId((current) =>
                              current === message.id ? null : message.id
                            )
                          }
                        >
                          ⋯
                        </button>

                        {openMenuId === message.id && (
                          <div className="post-menu">
                            {message.sender?.toLowerCase() === account?.toLowerCase() &&
                              !message.deleted && (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      actionLoading ||
                                      Date.now() / 1000 - message.timestamp > 15 * 60
                                    }
                                    onClick={() => {
                                      const age = Date.now() / 1000 - message.timestamp;
                                      if (age > 15 * 60) return;
                                      setEditDraft(parsePostContent(message.content).text);
                                      setEditingMessage(message);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <span>✎</span>
                                    {Date.now() / 1000 - message.timestamp <= 15 * 60
                                      ? `Edit · ${Math.max(1, Math.ceil((15 * 60 - (Date.now() / 1000 - message.timestamp)) / 60))}m left`
                                      : "Edit · expired"}
                                  </button>

                                  <button
                                    type="button"
                                    className="danger"
                                    disabled={actionLoading}
                                    onClick={async () => {
                                      setOpenMenuId(null);
                                      const confirmed = window.confirm(
                                        "Delete this post? It will be marked as deleted on-chain."
                                      );
                                      if (confirmed) {
                                        await deleteMessage(message.id);
                                      }
                                    }}
                                  >
                                    <span>⌫</span>
                                    Delete post
                                  </button>
                                </>
                              )}

                            <button
                              type="button"
                              disabled={actionLoading || message.deleted}
                              onClick={() => {
                                setReportReason("Spam");
                                setReportingMessage(message);
                                setOpenMenuId(null);
                              }}
                            >
                              <span>⚑</span>
                              Report post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const media = parsePostContent(message.content);
                    return (
                      <>
                        <div className={`post-body ${message.deleted ? "post-body-deleted" : ""}`}>
                          {message.deleted
                            ? "This message was deleted by the author."
                            : media.text}
                        </div>
                        {!message.deleted && media.imageUrl && (
                          <img
                            className="post-media-image"
                            src={media.imageUrl}
                            alt="Post attachment"
                            loading="lazy"
                          />
                        )}
                      </>
                    );
                  })()}

                  <div className="post-meta">
                    <span>
                      {formatTime(message.timestamp)}
                      {message.editedAt > 0 && !message.deleted && " · edited"}
                    </span>

                    <span className="onchain-badge">
                      ● ON-CHAIN
                    </span>
                  </div>

                  <div className="post-actions">
                    <button
                      className={
                        liked
                          ? "action active"
                          : "action"
                      }
                      onClick={() =>
                        toggleLike(
                          message.id
                        )
                      }
                    >
                      <span>
                        {liked
                          ? "♥"
                          : "♡"}
                      </span>

                      {liked
                        ? "Liked"
                        : "Like"}{message.likeCount > 0 && ` ${message.likeCount}`}
                    </button>

                    <button
                      className={
                        comments.length > 0
                          ? "action active"
                          : "action"
                      }
                      onClick={() => {
                        const element =
                          document.getElementById(
                            `comment-${message.id}`
                          );

                        element?.focus();
                      }}
                    >
                      <span>
                        ◌
                      </span>

                      Comment

                      {comments.length >
                        0 &&
                        ` ${comments.length}`}
                    </button>

                    <button
                      className={
                        reposted
                          ? "action active"
                          : "action"
                      }
                      onClick={() =>
                        toggleRepost(
                          message.id
                        )
                      }
                    >
                      <span>
                        ↻
                      </span>

                      {reposted
                        ? "Reposted"
                        : "Repost"}{message.repostCount > 0 &&
                        ` ${message.repostCount}`}
                    </button>
                  </div>

                  <div className="comment-area">
                    <input
                      id={`comment-${message.id}`}
                      type="text"
                      value={
                        commentInputs[
                          message.id
                        ] || ""
                      }
                      onChange={(event) => {
                        updateCommentInput(
                          message.id,
                          event.target.value
                        );
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          addComment(
                            message.id
                          );
                        }
                      }}
                      placeholder="Write a comment..."
                      maxLength={250}
                      autoComplete="off"
                      spellCheck={false}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        addComment(
                          message.id
                        )
                      }
                    >
                      →
                    </button>
                  </div>

                  {comments.length >
                    0 && (
                    <div className="comments-list">
                      {comments.map(
                        (comment) => (
                          <div
                            className="comment"
                            key={comment.id}
                          >
                            <div className="comment-avatar">
                              {comment.username
                                ?.charAt(0)
                                ?.toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  comment.username
                                }
                              </strong>

                              <p>
                                {
                                  comment.content
                                }
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="transaction-line">
                    <span>
                      Blockchain message
                    </span>

                    <span>
                      {formatAddress(
                        message.sender
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {editingMessage && (
        <div className="action-modal-backdrop" onClick={() => !actionLoading && setEditingMessage(null)}>
          <div className="action-modal" onClick={(event) => event.stopPropagation()}>
            <div className="action-modal-heading">
              <div>
                <span className="eyebrow">EDIT POST</span>
                <h2>Edit your message</h2>
                <p>You have 15 minutes from posting to edit the content.</p>
              </div>
              <button
                type="button"
                className="action-modal-close"
                onClick={() => !actionLoading && setEditingMessage(null)}
              >
                ×
              </button>
            </div>

            <textarea
              className="action-modal-textarea"
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              maxLength={500}
              autoFocus
              disabled={actionLoading}
            />

            <div className="action-modal-footer">
              <span>{editDraft.length}/500</span>
              <div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => !actionLoading && setEditingMessage(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => editMessage(editingMessage.id, editDraft)}
                  disabled={actionLoading || !editDraft.trim()}
                >
                  {actionLoading ? "Saving..." : "Save edit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportingMessage && (
        <div className="action-modal-backdrop" onClick={() => !actionLoading && setReportingMessage(null)}>
          <div className="action-modal report-modal" onClick={(event) => event.stopPropagation()}>
            <div className="action-modal-heading">
              <div>
                <span className="eyebrow">COMMUNITY REPORT</span>
                <h2>Report this post</h2>
                <p>Choose the reason that best describes the problem.</p>
              </div>
              <button
                type="button"
                className="action-modal-close"
                onClick={() => !actionLoading && setReportingMessage(null)}
              >
                ×
              </button>
            </div>

            <div className="report-options">
              {["Spam", "Fraud / Scam", "Harassment", "Suspicious / Other"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={reportReason === reason ? "report-option active" : "report-option"}
                  onClick={() => setReportReason(reason)}
                  disabled={actionLoading}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="action-modal-footer">
              <span>Reports are recorded on-chain.</span>
              <div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => !actionLoading && setReportingMessage(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn report-submit"
                  onClick={async () => {
                    const submitted = await reportMessage(reportingMessage.id, reportReason);
                    if (submitted) setReportingMessage(null);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        className="compose-floating"
        onClick={openCompose}
        aria-label="Write a message"
        type="button"
      >
        <span>
          ✎
        </span>
      </button>
    </div>
  );
}

/* =====================================================
   COMPOSE PAGE
===================================================== */

function ComposePage({
  account,
  profile,
  content,
  setContent,
  loading,
  error,
  postMessage,
  openGlobal,
  formatAddress,
  postImagePreview,
  handlePostImageChange,
  removePostImage,
}) {
  return (
    <div className="app-page">
      <header className="app-nav">
        <button
          className="brand-button"
          onClick={openGlobal}
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>

            <small>
              WRITE ON-CHAIN
            </small>
          </span>
        </button>

        <button
          className="back-button"
          onClick={openGlobal}
        >
          ← Global Wall
        </button>
      </header>

      <main className="compose-container">
        <div className="compose-heading">
          <span className="eyebrow">
            NEW MESSAGE
          </span>

          <h1>
            Write something
            <br />
            <span>
              worth putting on-chain.
            </span>
          </h1>

          <p>
            Your message will be permanently recorded
            on the Arc blockchain.
          </p>
        </div>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}

        <form
          className="compose-card"
          onSubmit={postMessage}
        >
          <div className="compose-user">
            <Avatar
              src={profile?.avatar}
              name={profile?.username || "ChainWall"}
              large
              className="compose-profile-avatar"
            />

            <div>
              <strong>
                {profile?.username}
              </strong>

              <span>
                {formatAddress(account)}
              </span>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(event) => {
              setContent(
                event.target.value
              );
            }}
            placeholder="Write your message..."
            maxLength={500}
            autoFocus
            spellCheck={true}
          />

          {postImagePreview && (
            <div className="post-image-preview-wrap">
              <div className="post-image-preview-header">
                <span>Attached image</span>
                <button
                  type="button"
                  className="post-image-remove"
                  onClick={removePostImage}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
              <img
                className="post-image-preview"
                src={postImagePreview}
                alt="Post preview"
              />
            </div>
          )}

          <div className="compose-footer">
            <div className="compose-tools">
              <label className="image-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePostImageChange}
                  disabled={loading}
                />
                <span>▧</span>
                Add image
              </label>
              <span>
                {content.length}/500
              </span>
            </div>

            <button
              className="primary-btn post-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Posting..."
                : "Post Message"}

              <span>
                ↗
              </span>
            </button>
          </div>

          <div className="compose-note">
            <span>
              ◆
            </span>

            This message will be recorded on-chain.
          </div>
        </form>
      </main>
    </div>
  );
}

/* =====================================================
   SUCCESS PAGE
===================================================== */

function SuccessPage({
  transactionHash,
  openGlobal,
  openCompose,
  formatAddress,
}) {
  return (
    <div className="app-page success-page">
      <header className="app-nav">
        <button
          className="brand-button"
          onClick={openGlobal}
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-copy">
            <strong>
              Chain<span>Wall</span>
            </strong>

            <small>
              MESSAGE POSTED
            </small>
          </span>
        </button>
      </header>

      <main className="success-container">
        <div className="success-orb">
          ✓
        </div>

        <span className="eyebrow">
          TRANSACTION CONFIRMED
        </span>

        <h1>
          Your message
          <br />
          is{" "}
          <span>
            on-chain.
          </span>
        </h1>

        <p>
          Your message has been successfully recorded
          on the Arc blockchain.
        </p>

        {transactionHash && (
          <div className="tx-card">
            <span>
              Transaction
            </span>

            <strong>
              {formatAddress(
                transactionHash
              )}
            </strong>
          </div>
        )}

        <div className="success-actions">
          <button
            className="primary-btn"
            onClick={openGlobal}
          >
            Back to Global Wall
            <span>
              →
            </span>
          </button>

          <button
            className="secondary-btn"
            onClick={openCompose}
          >
            Write another
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;