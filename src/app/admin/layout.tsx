import AdminLayoutClient from "./components/AdminLayoutClient";

export const metadata = {
    title: "StoryCut Admin Portal",
    description: "Manage your barbershop efficiently.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminLayoutClient>
            {children}
        </AdminLayoutClient>
    );
}
