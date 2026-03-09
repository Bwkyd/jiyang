// 默认催收阈值（天）
export const DEFAULT_OVERDUE_DAYS = 30;

// 扫码防抖时间（毫秒）
export const SCAN_DEBOUNCE_MS = 100;

// 分页默认每页条数
export const DEFAULT_PAGE_SIZE = 20;

// 微信小店 API
export const WECHAT_API_BASE = "https://api.weixin.qq.com";
export const WECHAT_TOKEN_URL = `${WECHAT_API_BASE}/cgi-bin/token`;
export const WECHAT_PRODUCT_LIST_URL = `${WECHAT_API_BASE}/channels/ec/product/list/get`;
export const WECHAT_PRODUCT_GET_URL = `${WECHAT_API_BASE}/channels/ec/product/get`;

// 微信小店商品同步：每页条数
export const WECHAT_SYNC_PAGE_SIZE = 30;

// 微信小店商品状态：上架中
export const WECHAT_PRODUCT_STATUS_LISTED = 5;
