// 额度管理服务
// 处理用户生成配额的检查、扣减、重置等操作

export interface QuotaInfo {
  used: number;           // 今日已使用次数
  limit: number;          // 每日限额
  remaining: number;      // 剩余次数
  resetTime: Date;       // 重置时间
  isPremium: boolean;     // 是否为付费用户
  lastChecked: Date;     // 最后检查时间
}

export interface QuotaCheckResult {
  allowed: boolean;        // 是否允许生成
  remaining: number;       // 剩余次数
  message?: string;        // 提示信息
  error?: string;           // 错误信息（如果拒绝）
}

const QUOTA_STORAGE_KEY = 'teachers_quota';
const _QUOTA_LOCAL_RESET_KEY = 'teachers_quota_last_reset';

// 默认配置
const DEFAULT_QUOTAS = {
  FREE_USER_DAILY_LIMIT: 5,
  LOGIN_USER_DAILY_LIMIT: 20,
  PREMIUM_USER_DAILY_LIMIT: -1, // -1 表示无限
  RESET_HOUR: 0,            // 重置时间（0点）
  RESET_MINUTE: 0
};

class QuotaService {
  private cachedQuota: QuotaInfo | null = null;

  /**
   * 检查是否允许生成评语
   */
  async checkQuota(): Promise<QuotaCheckResult> {
    try {
      // 1. 尝试从远程服务器获取最新额度
      const remoteQuota = await this.fetchRemoteQuota();
      
      if (remoteQuota) {
        this.cachedQuota = remoteQuota;
        this.saveToLocal(remoteQuota);
        
        return {
          allowed: remoteQuota.remaining > 0 || remoteQuota.isPremium,
          remaining: remoteQuota.isPremium ? 999 : remoteQuota.remaining,
          message: this.generateMessage(remoteQuota)
        };
      }
      
      // 2. 如果远程失败，使用本地缓存
      const localQuota = this.getLocalQuota();
      
      if (localQuota) {
        // 检查是否需要重置（新的一天）
        if (this.shouldReset(localQuota)) {
          localQuota.used = 0;
          localQuota.remaining = localQuota.limit;
          localQuota.resetTime = this.getNextResetTime();
          this.saveToLocal(localQuota);
        }
        
        return {
          allowed: localQuota.remaining > 0 || localQuota.isPremium,
          remaining: localQuota.isPremium ? 999 : localQuota.remaining,
          message: this.generateMessage(localQuota)
        };
      }
      
      // 3. 使用默认值（未登录状态）
      return {
        allowed: true,
        remaining: DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT,
        message: `今日免费额度：${DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT} 次`
      };
      
    } catch (error) {
      console.error('Check quota error:', error);
      return {
        allowed: true, // 出错时允许生成，避免阻塞用户
        remaining: DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT,
        error: '无法连接服务器，使用默认额度'
      };
    }
  }

  /**
   * 扣减一次额度（生成成功后调用）
   */
  async decrementQuota(): Promise<boolean> {
    try {
      // 1. 尝试远程扣减
      const response = await fetch('/api/quota', {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 更新本地缓存
        if (this.cachedQuota) {
          this.cachedQuota.used = result.used || (this.cachedQuota.used + 1);
          this.cachedQuota.remaining = result.remaining || Math.max(0, this.cachedQuota.remaining - 1);
          this.saveToLocal(this.cachedQuota);
        }
        
        return true;
      }
      
      // 2. 远程失败时本地扣减
      return this.decrementLocalQuota();
      
    } catch (error) {
      console.error('Decrement quota error:', error);
      return this.decrementLocalQuota();
    }
  }

  /**
   * 获取当前额度信息（用于显示）
   */
  async getQuotaInfo(): Promise<QuotaInfo> {
    if (this.cachedQuota) {
      // 检查缓存是否过期（5分钟内不重复请求）
      const now = new Date();
      const cacheAge = now.getTime() - this.cachedQuota.lastChecked.getTime();
      
      if (cacheAge < 5 * 60 * 1000) { // 5分钟内
        return this.cachedQuota;
      }
    }
    
    // 刷新缓存
    const result = await this.checkQuota();
    
    // 构建返回对象
    const quota: QuotaInfo = {
      used: this.cachedQuota?.used || 0,
      limit: this.cachedQuota?.limit || DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT,
      remaining: result.remaining,
      resetTime: this.cachedQuota?.resetTime || this.getNextResetTime(),
      isPremium: this.cachedQuota?.isPremium || false,
      lastChecked: new Date()
    };
    
    this.cachedQuota = quota;
    return quota;
  }

  /**
   * 强制刷新额度（从服务器获取最新数据）
   */
  async forceRefresh(): Promise<QuotaInfo> {
    this.cachedQuota = null;
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    return this.getQuotaInfo();
  }

  // ========== 私有方法 ==========

  private async fetchRemoteQuota(): Promise<QuotaInfo | null> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const response = await fetch('/api/quota', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token 过期或无效
          localStorage.removeItem('auth_token');
          return null;
        }
        return null;
      }

      const data = await response.json();
      
      return {
        used: data.used || 0,
        limit: data.limit || DEFAULT_QUOTAS.LOGIN_USER_DAILY_LIMIT,
        remaining: data.remaining ?? Math.max(0, (data.limit || 20) - (data.used || 0)),
        resetTime: new Date(data.reset_time || this.getNextResetTime()),
        isPremium: data.is_premium || false,
        lastChecked: new Date()
      };
      
    } catch (error) {
      console.error('Fetch remote quota failed:', error);
      return null;
    }
  }

  private getLocalQuota(): QuotaInfo | null {
    try {
      const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        resetTime: new Date(parsed.resetTime),
        lastChecked: new Date(parsed.lastChecked)
      };
    } catch (error) {
      console.error('Parse local quota failed:', error);
      return null;
    }
  }

  private saveToLocal(quota: QuotaInfo): void {
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({
        ...quota,
        lastChecked: new Date()
      }));
    } catch (error) {
      console.error('Save quota to local failed:', error);
    }
  }

  private decrementLocalQuota(): boolean {
    const quota = this.getLocalQuota() || {
      used: 0,
      limit: DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT,
      remaining: DEFAULT_QUOTAS.FREE_USER_DAILY_LIMIT,
      resetTime: this.getNextResetTime(),
      isPremium: false,
      lastChecked: new Date()
    };

    if (quota.isPremium) {
      return true; // 无限用户不需要扣减
    }

    if (quota.remaining <= 0) {
      return false; // 额度已用完
    }

    quota.used += 1;
    quota.remaining -= 1;
    this.saveToLocal(quota);
    this.cachedQuota = quota;
    
    return true;
  }

  private shouldReset(quota: QuotaInfo): boolean {
    const now = new Date();
    const reset = new Date(quota.resetTime);
    
    return now >= reset;
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(DEFAULT_QUOTAS.RESET_HOUR, DEFAULT_QUOTAS.RESET_MINUTE, 0, 0);
    
    return tomorrow;
  }

  private generateMessage(quota: QuotaInfo): string {
    if (quota.isPremium) {
      return '✨ 专业版会员，无限制使用';
    }

    if (quota.remaining <= 0) {
      return '😔 今日免费额度已用尽';
    }

    if (quota.remaining <= 2) {
      return `⚠️ 剩余 ${quota.remaining} 次（即将用完）`;
    }

    return `📊 今日剩余 ${quota.remaining}/${quota.limit} 次`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}

// 导出单例实例
export const quotaService = new QuotaService();

// 便捷 Hook 集成函数
export async function checkAndDecrementQuota(): Promise<{
  canGenerate: boolean;
  quotaInfo: QuotaInfo | null;
  message: string;
}> {
  const checkResult = await quotaService.checkQuota();
  
  if (!checkResult.allowed) {
    return {
      canGenerate: false,
      quotaInfo: await quotaService.getQuotaInfo(),
      message: checkResult.message || '今日额度已用完',
    };
  }

  // 允许生成，先扣减额度
  await quotaService.decrementQuota();

  return {
    canGenerate: true,
    quotaInfo: await quotaService.getQuotaInfo(),
    message: '✅ 准备就绪！'
  };
}
