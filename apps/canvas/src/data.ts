export const PRESETS: Record<string, string> = {
    "E-Commerce": JSON.stringify([
        { id: 1, name: "Neural Interface", price: 2999, stock: 45, category: "Hardware", active: true },
        { id: 2, name: "Quantum Chip", price: 599, stock: 1200, category: "Components", active: true },
        { id: 3, name: "Holo-Display", price: 899, stock: 0, category: "Hardware", active: false },
        { id: 4, name: "Synapse Link", price: 149, stock: 500, category: "Cables", active: true },
        { id: 5, name: "Bio-Sensor", price: 299, stock: 150, category: "Sensors", active: true },
    ], null, 2),
    "Users": JSON.stringify([
        { id: "u_1", name: "Alice Chen", role: "admin", level: 5, department: "Ops", lastLogin: "2025-01-01" },
        { id: "u_2", name: "Bob Smith", role: "user", level: 2, department: "Ops", lastLogin: "2025-01-02" },
        { id: "u_3", name: "Carol Wu", role: "user", level: 2, department: "Dev", lastLogin: "2025-01-02" },
        { id: "u_4", name: "Dave Miller", role: "guest", level: 0, department: "External", lastLogin: "2024-12-30" },
    ], null, 2),
};
