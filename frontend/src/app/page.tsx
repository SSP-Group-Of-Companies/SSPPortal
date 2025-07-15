// Public Home Page — SSPPortal
// Entry point for internal access to all SSP tools

import { redirect } from "next/navigation";

export default function Home() {
  return (
    redirect("/login")
  );
}
