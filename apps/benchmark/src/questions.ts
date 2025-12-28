export type AnswerType = 'integer' | 'number' | 'string' | 'boolean' | 'list'

export interface Question {
    id: string
    dataset: 'employees' | 'products' | 'orders' | 'analytics' | 'sensors'
    prompt: string
    groundTruth: string | number | boolean
    answerType: AnswerType
}

export function generateQuestions(data: {
    employees: any[]
    products: any[]
    orders: any[]
    analytics: any[]
    sensors: any[]
}): Question[] {
    const questions: Question[] = []

    const emp = data.employees
    const firstEmp = emp[0]
    const lastEmp = emp[emp.length - 1]
    const activeCount = emp.filter((e: any) => e.active).length
    const depts = [...new Set(emp.map((e: any) => e.department))]
    const highestPaid = emp.reduce((a: any, b: any) => a.salary > b.salary ? a : b)
    const engineeringCount = emp.filter((e: any) => e.department === 'Engineering').length
    const adminCount = emp.filter((e: any) => e.role === 'admin').length

    questions.push(
        { id: 'emp_1', dataset: 'employees', prompt: 'What is the name of the first employee?', groundTruth: firstEmp.name, answerType: 'string' },
        { id: 'emp_2', dataset: 'employees', prompt: 'What is the email of the last employee?', groundTruth: lastEmp.email, answerType: 'string' },
        { id: 'emp_3', dataset: 'employees', prompt: 'How many employees are active?', groundTruth: activeCount, answerType: 'integer' },
        { id: 'emp_4', dataset: 'employees', prompt: 'How many unique departments are there?', groundTruth: depts.length, answerType: 'integer' },
        { id: 'emp_5', dataset: 'employees', prompt: 'What is the name of the highest paid employee?', groundTruth: highestPaid.name, answerType: 'string' },
        { id: 'emp_6', dataset: 'employees', prompt: 'What is the salary of the highest paid employee?', groundTruth: highestPaid.salary, answerType: 'integer' },
        { id: 'emp_7', dataset: 'employees', prompt: 'What department does the first employee work in?', groundTruth: firstEmp.department, answerType: 'string' },
        { id: 'emp_8', dataset: 'employees', prompt: 'How many employees work in Engineering?', groundTruth: engineeringCount, answerType: 'integer' },
        { id: 'emp_9', dataset: 'employees', prompt: 'How many employees have the role admin?', groundTruth: adminCount, answerType: 'integer' },
        { id: 'emp_10', dataset: 'employees', prompt: 'What is the hire date of the first employee?', groundTruth: firstEmp.hireDate, answerType: 'string' },
        { id: 'emp_11', dataset: 'employees', prompt: 'Is the first employee active? Answer yes or no.', groundTruth: firstEmp.active, answerType: 'boolean' },
        { id: 'emp_12', dataset: 'employees', prompt: 'What is the total number of employees?', groundTruth: emp.length, answerType: 'integer' }
    )

    const prod = data.products
    const firstProd = prod[0]
    const lastProd = prod[prod.length - 1]
    const inStockCount = prod.filter((p: any) => p.stock > 0).length
    const categories = [...new Set(prod.map((p: any) => p.category))]
    const mostExpensive = prod.reduce((a: any, b: any) => a.price > b.price ? a : b)
    const electronicsCount = prod.filter((p: any) => p.category === 'Electronics').length
    const totalStock = prod.reduce((sum: number, p: any) => sum + p.stock, 0)

    questions.push(
        { id: 'prod_1', dataset: 'products', prompt: 'What is the name of the first product?', groundTruth: firstProd.name, answerType: 'string' },
        { id: 'prod_2', dataset: 'products', prompt: 'What is the price of the last product?', groundTruth: lastProd.price, answerType: 'number' },
        { id: 'prod_3', dataset: 'products', prompt: 'How many products are in stock (stock > 0)?', groundTruth: inStockCount, answerType: 'integer' },
        { id: 'prod_4', dataset: 'products', prompt: 'How many unique categories are there?', groundTruth: categories.length, answerType: 'integer' },
        { id: 'prod_5', dataset: 'products', prompt: 'What is the name of the most expensive product?', groundTruth: mostExpensive.name, answerType: 'string' },
        { id: 'prod_6', dataset: 'products', prompt: 'What is the price of the most expensive product?', groundTruth: mostExpensive.price, answerType: 'number' },
        { id: 'prod_7', dataset: 'products', prompt: 'What category is the first product in?', groundTruth: firstProd.category, answerType: 'string' },
        { id: 'prod_8', dataset: 'products', prompt: 'How many products are in the Electronics category?', groundTruth: electronicsCount, answerType: 'integer' },
        { id: 'prod_9', dataset: 'products', prompt: 'What is the total stock across all products?', groundTruth: totalStock, answerType: 'integer' },
        { id: 'prod_10', dataset: 'products', prompt: 'Is the first product active? Answer yes or no.', groundTruth: firstProd.active, answerType: 'boolean' }
    )

    const ord = data.orders
    const firstOrd = ord[0]
    const lastOrd = ord[ord.length - 1]
    const pendingCount = ord.filter((o: any) => o.status === 'pending').length
    const deliveredCount = ord.filter((o: any) => o.status === 'delivered').length
    const totalRevenue = Math.round(ord.reduce((sum: number, o: any) => sum + o.total, 0) * 100) / 100
    const highestOrder = ord.reduce((a: any, b: any) => a.total > b.total ? a : b)
    const avgItems = Math.round(ord.reduce((sum: number, o: any) => sum + o.items, 0) / ord.length * 10) / 10

    questions.push(
        { id: 'ord_1', dataset: 'orders', prompt: 'What is the name of the first customer?', groundTruth: firstOrd.customerName, answerType: 'string' },
        { id: 'ord_2', dataset: 'orders', prompt: 'What is the status of the last order?', groundTruth: lastOrd.status, answerType: 'string' },
        { id: 'ord_3', dataset: 'orders', prompt: 'How many orders have pending status?', groundTruth: pendingCount, answerType: 'integer' },
        { id: 'ord_4', dataset: 'orders', prompt: 'How many orders have been delivered?', groundTruth: deliveredCount, answerType: 'integer' },
        { id: 'ord_5', dataset: 'orders', prompt: 'What is the total revenue from all orders?', groundTruth: totalRevenue, answerType: 'number' },
        { id: 'ord_6', dataset: 'orders', prompt: 'What is the total of the highest value order?', groundTruth: highestOrder.total, answerType: 'number' },
        { id: 'ord_7', dataset: 'orders', prompt: 'How many items are in the first order?', groundTruth: firstOrd.items, answerType: 'integer' },
        { id: 'ord_8', dataset: 'orders', prompt: 'What is the customer ID of the first order?', groundTruth: firstOrd.customerId, answerType: 'integer' }
    )

    const ana = data.analytics
    const firstEvent = ana[0]
    const pageViews = ana.filter((e: any) => e.eventType === 'page_view').length
    const clickCount = ana.filter((e: any) => e.eventType === 'click').length
    const errorCount = ana.filter((e: any) => e.eventType === 'error').length
    const successfulCount = ana.filter((e: any) => e.successful).length
    const avgDuration = Math.round(ana.reduce((sum: number, e: any) => sum + e.duration, 0) / ana.length)
    const homePageViews = ana.filter((e: any) => e.page === '/home').length

    questions.push(
        { id: 'ana_1', dataset: 'analytics', prompt: 'What is the event type of the first event?', groundTruth: firstEvent.eventType, answerType: 'string' },
        { id: 'ana_2', dataset: 'analytics', prompt: 'How many page_view events are there?', groundTruth: pageViews, answerType: 'integer' },
        { id: 'ana_3', dataset: 'analytics', prompt: 'How many click events are there?', groundTruth: clickCount, answerType: 'integer' },
        { id: 'ana_4', dataset: 'analytics', prompt: 'How many error events are there?', groundTruth: errorCount, answerType: 'integer' },
        { id: 'ana_5', dataset: 'analytics', prompt: 'How many events were successful?', groundTruth: successfulCount, answerType: 'integer' },
        { id: 'ana_6', dataset: 'analytics', prompt: 'What is the average duration in milliseconds?', groundTruth: avgDuration, answerType: 'integer' },
        { id: 'ana_7', dataset: 'analytics', prompt: 'How many events occurred on the /home page?', groundTruth: homePageViews, answerType: 'integer' },
        { id: 'ana_8', dataset: 'analytics', prompt: 'What page did the first event occur on?', groundTruth: firstEvent.page, answerType: 'string' }
    )

    const sens = data.sensors
    const firstReading = sens[0]
    const avgTemp = Math.round(sens.reduce((sum: number, r: any) => sum + r.temperature, 0) / sens.length * 10) / 10
    const maxTemp = sens.reduce((a: any, b: any) => a.temperature > b.temperature ? a : b).temperature
    const minTemp = sens.reduce((a: any, b: any) => a.temperature < b.temperature ? a : b).temperature
    const locations = [...new Set(sens.map((r: any) => r.location))]
    const buildingACount = sens.filter((r: any) => r.location === 'Building_A').length
    const avgHumidity = Math.round(sens.reduce((sum: number, r: any) => sum + r.humidity, 0) / sens.length)

    questions.push(
        { id: 'sens_1', dataset: 'sensors', prompt: 'What is the sensor ID of the first reading?', groundTruth: firstReading.sensorId, answerType: 'string' },
        { id: 'sens_2', dataset: 'sensors', prompt: 'What is the average temperature across all readings?', groundTruth: avgTemp, answerType: 'number' },
        { id: 'sens_3', dataset: 'sensors', prompt: 'What is the maximum temperature recorded?', groundTruth: maxTemp, answerType: 'number' },
        { id: 'sens_4', dataset: 'sensors', prompt: 'What is the minimum temperature recorded?', groundTruth: minTemp, answerType: 'number' },
        { id: 'sens_5', dataset: 'sensors', prompt: 'How many unique locations are there?', groundTruth: locations.length, answerType: 'integer' },
        { id: 'sens_6', dataset: 'sensors', prompt: 'How many readings are from Building_A?', groundTruth: buildingACount, answerType: 'integer' },
        { id: 'sens_7', dataset: 'sensors', prompt: 'What is the humidity of the first reading?', groundTruth: firstReading.humidity, answerType: 'number' },
        { id: 'sens_8', dataset: 'sensors', prompt: 'What location is the first reading from?', groundTruth: firstReading.location.replace('_', ' '), answerType: 'string' },
        { id: 'sens_9', dataset: 'sensors', prompt: 'What is the average humidity across all readings?', groundTruth: avgHumidity, answerType: 'integer' },
        { id: 'sens_10', dataset: 'sensors', prompt: 'What is the pressure of the first reading?', groundTruth: firstReading.pressure, answerType: 'number' }
    )

    return questions
}
