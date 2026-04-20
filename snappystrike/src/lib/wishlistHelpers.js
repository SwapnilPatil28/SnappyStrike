const STORAGE_KEY = "snappy_wishlist";

// Get items from localStorage
const getLocalWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

// Save items to localStorage
const saveLocalWishlist = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

// Add a product to the wishlist (cloud for logged-in, localStorage for guests)
export const addToWishlist = async (product, user) => {
  const newItem = { id: product.id, name: product.name, price: product.price, qty: 1, storeId: product.storeId };

  if (user) {
    try {
      const { db } = await import("../services/firebase");
      const { doc, getDoc, setDoc } = await import("firebase/firestore");

      const docRef = doc(db, "wishlists", user.uid);
      const snap = await getDoc(docRef);
      let items = snap.exists() ? (snap.data().items || []) : [];

      const existing = items.find(i => i.id === product.id);
      if (existing) {
        items = items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      } else {
        items.push(newItem);
      }

      await setDoc(docRef, { userId: user.uid, items });
      return true;
    } catch (e) {
      console.warn("Cloud wishlist failed, falling back to localStorage:", e.message);
      // Fallback to localStorage if Firebase denies permission
      const local = getLocalWishlist();
      const existing = local.find(i => i.id === product.id);
      if (existing) {
        saveLocalWishlist(local.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      } else {
        local.push(newItem);
        saveLocalWishlist(local);
      }
      return true;
    }
  } else {
    // Guest — pure localStorage
    const local = getLocalWishlist();
    const existing = local.find(i => i.id === product.id);
    if (existing) {
      saveLocalWishlist(local.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      local.push(newItem);
      saveLocalWishlist(local);
    }
    return true;
  }
};

// Load the full wishlist (merging cloud + local if needed)
export const loadWishlist = async (user) => {
  if (user) {
    try {
      const { db } = await import("../services/firebase");
      const { doc, getDoc, setDoc } = await import("firebase/firestore");

      const docRef = doc(db, "wishlists", user.uid);
      const snap = await getDoc(docRef);
      let cloudItems = snap.exists() ? (snap.data().items || []) : [];

      // Merge any localStorage items left over from guest session
      const localItems = getLocalWishlist();
      if (localItems.length > 0) {
        for (const li of localItems) {
          const match = cloudItems.find(ci => ci.id === li.id);
          if (match) {
            match.qty += li.qty;
          } else {
            cloudItems.push(li);
          }
        }
        await setDoc(docRef, { userId: user.uid, items: cloudItems });
        localStorage.removeItem(STORAGE_KEY);
      }

      return cloudItems;
    } catch (e) {
      console.warn("Cloud wishlist load failed, using localStorage:", e.message);
      return getLocalWishlist();
    }
  } else {
    return getLocalWishlist();
  }
};

// Sync/save the entire wishlist
export const syncWishlist = async (items, user) => {
  if (user) {
    try {
      const { db } = await import("../services/firebase");
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "wishlists", user.uid), { userId: user.uid, items });
    } catch (e) {
      console.warn("Cloud sync failed, saving locally:", e.message);
      saveLocalWishlist(items);
    }
  } else {
    saveLocalWishlist(items);
  }
};
