"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type WalletContextValue = {
  publicKey: string | null;
  setPublicKey: (key: string | null) => void;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKeyState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedKey = window.localStorage.getItem("sentinel_wallet_key");
    if (storedKey) {
      setPublicKeyState(storedKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (publicKey) {
      window.localStorage.setItem("sentinel_wallet_key", publicKey);
    } else {
      window.localStorage.removeItem("sentinel_wallet_key");
    }
  }, [publicKey]);

  const setPublicKey = useCallback((key: string | null) => {
    setPublicKeyState(key);
  }, []);

  const value = useMemo(
    () => ({
      publicKey,
      setPublicKey,
    }),
    [publicKey, setPublicKey],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }

  return context;
}
