import { ReactNode } from "react";

import { ApiProvider } from "@/modules/api/api-context";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <ApiProvider>{children}</ApiProvider>;
}
