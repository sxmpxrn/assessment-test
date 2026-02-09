import React from "react";

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white min-h-screen print:p-0">
            {children}
        </div>
    );
}
