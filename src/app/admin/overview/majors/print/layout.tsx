import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Print Major Overview | Admin Dashboard',
    description: 'Printable view of Major assessment overview',
};

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            {children}
        </div>
    );
}
