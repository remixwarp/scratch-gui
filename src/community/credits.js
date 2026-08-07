const PURCHASE_TIERS = [
    {credits: 50, price: 6.99, link: 'https://ifdian.net/order/create?product_type=1&plan_id=9336922490c911f1b6855254001e7c00&sku=%5B%7B%22sku_id%22%3A%22934012c290c911f1ac695254001e7c00%22,%22count%22%3A1%7D%5D'},
    {credits: 200, price: 19.99, link: 'https://ifdian.net/order/create?product_type=1&plan_id=9336922490c911f1b6855254001e7c00&sku=%5B%7B%22sku_id%22%3A%229348610290c911f183e45254001e7c00%22,%22count%22%3A1%7D%5D'},
    {credits: 500, price: 39.99, link: 'https://ifdian.net/order/create?product_type=1&plan_id=9336922490c911f1b6855254001e7c00&sku=%5B%7B%22sku_id%22%3A%22934f8c5c90c911f1baee5254001e7c00%22,%22count%22%3A1%7D%5D'}
];

const KO_FI_SHOP_URL = 'https://ifdian.net/a/RyaninCn11';

// Detect an "insufficient funds" failure from a Bilup Accounts transfer error.
const isInsufficientFunds = error => {
    const message = String((error && error.message) || error || '').toLowerCase();
    return message.includes('insufficient') || message.includes('not enough') || message.includes('balance');
};

export {PURCHASE_TIERS, KO_FI_SHOP_URL, isInsufficientFunds};