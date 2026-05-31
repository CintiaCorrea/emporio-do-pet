"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface PageHeader {
  title: string;
  subtitle?: string;
}

interface Ctx {
  header: PageHeader;
  setHeader: (h: PageHeader) => void;
}

const PageHeaderCtx = createContext<Ctx>({ header: { title: "" }, setHeader: () => {} });

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader>({ title: "" });
  return <PageHeaderCtx.Provider value={{ header, setHeader }}>{children}</PageHeaderCtx.Provider>;
}

export function usePageHeader() {
  return useContext(PageHeaderCtx);
}

export function usePageTitle(title: string, subtitle?: string) {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader({ title, subtitle });
  }, [title, subtitle]);
}
