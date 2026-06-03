# 评语助手 / CommentGenius

AI 教师评语生成工具 — Minicode 矩阵产品线 #2

## 子域名
**teachers.minicode.cloud**（待部署）

## 产品定位
专为 K12 教师设计的 AI 评语生成工具，帮助教师快速生成个性化、有温度的学生评语，节省 80% 以上时间。

## 技术栈（规划）
- **前端**: React + Vite + Tailwind CSS（复用 soulspark 技术栈）
- **后端**: Cloudflare Workers + Hono（复用 soulspark 基础设施）
- **数据库**: Supabase（同一实例，隔离表空间）
- **AI**: 通义千问 API
- **支付**: 复用虎皮椒微信支付 + PayPal Me

## 核心功能（MVP）
1. 单条评语生成（输入学生特点 → 10秒生成200-300字评语）
2. 风格定制（温和细腻/严谨客观/鼓励为主）
3. 批量处理（Excel导入全班信息）
4. 一键导出（Word/PDF/复制到微信）

## 目录结构（待创建）
```
teachers/
├── frontend/          # React + Vite 前端
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   ├── public/
│   └── package.json
├── backend/           # Cloudflare Worker 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── comments.ts     # 评语生成路由
│   │   │   └── templates.ts    # 模板管理
│   │   └── ...
│   └── wrangler.toml
└── README.md
```

## 开发状态
| 阶段 | 状态 |
|------|------|
| 基础设施搭建 | ⬜ 待开始 |
| MVP 开发 | ⬜ 待开始 |
| 内测 | ⬜ 待开始 |
| 上线 | ⬜ 待开始 |

## 共享依赖
```bash
# UI 组件
import { Button, Modal, PaymentFlow } from '@minicode/shared-ui';
import { apiClient } from '@minicode/shared-api';
```

## 相关文档
- [AI产品矩阵变现方案](../../shared/docs/docs/plans/AI产品矩阵变现方案.md)
- [Minicode 矩阵建站指南](../../shared/docs/docs/reports/MINICODE_MATRIX_GUIDE.md)

---
_创建日期: 2026-05-31 | 基于 MINICODE_MATRIX_GUIDE.md 第十节 Checklist_
