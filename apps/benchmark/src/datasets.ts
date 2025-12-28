export interface Employee {
    id: number
    name: string
    email: string
    department: string
    role: string
    salary: number
    active: boolean
    hireDate: string
}

export interface Product {
    id: number
    name: string
    category: string
    price: number
    stock: number
    active: boolean
}

export interface Order {
    id: number
    customerId: number
    customerName: string
    status: string
    total: number
    items: number
    createdAt: string
}

export interface AnalyticsEvent {
    id: number
    eventType: string
    userId: string
    page: string
    timestamp: string
    duration: number
    successful: boolean
}

export interface SensorReading {
    id: number
    sensorId: string
    location: string
    temperature: number
    humidity: number
    pressure: number
    timestamp: string
}

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations']
const ROLES = ['admin', 'user', 'guest', 'manager']
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Food']
const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const EVENT_TYPES = ['page_view', 'click', 'scroll', 'submit', 'error']
const PAGES = ['/home', '/products', '/checkout', '/profile', '/settings']
const LOCATIONS = ['Building_A', 'Building_B', 'Warehouse_1', 'Warehouse_2', 'Office']

const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    return date.toISOString().split('T')[0]
}

export function generateEmployees(count: number = 100): Employee[] {
    const employees: Employee[] = []
    for (let i = 1; i <= count; i++) {
        employees.push({
            id: i,
            name: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
            email: `user${i}@company.com`,
            department: randomChoice(DEPARTMENTS),
            role: randomChoice(ROLES),
            salary: randomInt(40000, 150000),
            active: Math.random() > 0.1,
            hireDate: randomDate(new Date(2015, 0, 1), new Date(2024, 11, 31))
        })
    }
    return employees
}

export function generateProducts(count: number = 50): Product[] {
    const products: Product[] = []
    const productNames = [
        'Widget Pro', 'Gadget X', 'Smart Device', 'Ultra Cable', 'Power Bank',
        'Wireless Hub', 'Digital Display', 'Sensor Kit', 'Controller V2', 'Adapter Plus'
    ]
    for (let i = 1; i <= count; i++) {
        products.push({
            id: i,
            name: `${randomChoice(productNames)} ${i}`,
            category: randomChoice(CATEGORIES),
            price: Math.round(randomInt(999, 99999)) / 100,
            stock: randomInt(0, 500),
            active: Math.random() > 0.15
        })
    }
    return products
}

export function generateOrders(count: number = 75): Order[] {
    const orders: Order[] = []
    for (let i = 1; i <= count; i++) {
        orders.push({
            id: i,
            customerId: randomInt(1, 100),
            customerName: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
            status: randomChoice(STATUSES),
            total: Math.round(randomInt(1000, 50000)) / 100,
            items: randomInt(1, 10),
            createdAt: randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31))
        })
    }
    return orders
}

export function generateAnalytics(count: number = 60): AnalyticsEvent[] {
    const events: AnalyticsEvent[] = []
    for (let i = 1; i <= count; i++) {
        events.push({
            id: i,
            eventType: randomChoice(EVENT_TYPES),
            userId: `user_${randomInt(1, 50)}`,
            page: randomChoice(PAGES),
            timestamp: new Date(Date.now() - randomInt(0, 86400000 * 7)).toISOString(),
            duration: randomInt(100, 30000),
            successful: Math.random() > 0.05
        })
    }
    return events
}

export function generateSensorReadings(count: number = 80): SensorReading[] {
    const readings: SensorReading[] = []
    for (let i = 1; i <= count; i++) {
        readings.push({
            id: i,
            sensorId: `sensor_${randomInt(1, 10)}`,
            location: randomChoice(LOCATIONS),
            temperature: Math.round((randomInt(150, 350) / 10) * 10) / 10,
            humidity: Math.round(randomInt(300, 800) / 10),
            pressure: Math.round(randomInt(9800, 10300) / 10),
            timestamp: new Date(Date.now() - randomInt(0, 3600000 * 24)).toISOString()
        })
    }
    return readings
}

export const DATASETS = {
    employees: generateEmployees,
    products: generateProducts,
    orders: generateOrders,
    analytics: generateAnalytics,
    sensors: generateSensorReadings
}
