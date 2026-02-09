"use client";

import { usePathname } from "next/navigation";
import Header from "@/app/component/header";

export default function HeaderWrapper({ user }: { user: any }) {
    const pathname = usePathname();
    // Hide header if path starts with /print
    if (pathname?.includes("/print")) {
        return null;
    }
    return <Header user={user} />;
}
