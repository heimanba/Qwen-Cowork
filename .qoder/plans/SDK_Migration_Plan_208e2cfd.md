# SDK 迁移计划：从 @anthropic-ai/claude-agent-sdk 到 @qwen-code/sdk

## 一、SDK API 对比分析

### 1.1 核心 API 对比

| 功能 | claude-agent-sdk | qwen-code/sdk | 兼容性 |
|------|------------------|---------------|--------|
| 主查询函数 | `query()` | `query()` | 完全兼容 |
| 消息类型 | `SDKMessage` | `SDKMessage` | 完全兼容 |
| 权限结果 | `PermissionResult` | `PermissionResult` | 完全兼容 |
| 用户消息 | `SDKUserMessage` | `SDKUserMessage` | 完全兼容 |
| 助手消息 | `SDKAssistantMessage` | `SDKAssistantMessage` | 完全兼容 |
| 结果消息 | `SDKResultMessage` | `SDKResultMessage` | 完全兼容 |
| 标题生成 | `unstable_v2_prompt` | 需自行实现 | 需适配 |

### 1.2 配置参数对比

| 参数 | claude-agent-sdk | qwen-code/sdk |
|------|------------------|---------------|
| 工作目录 | `cwd` | `cwd` |
| 会话恢复 | `resume` | 无直接对应 |
| 中断控制 | `abortController` | `abortController` |
| 环境变量 | `env` | `env` |
| 可执行路径 | `pathToClaudeCodeExecutable` | `pathToQwenExecutable` |
| 权限模式 | `permissionMode` | `permissionMode` |
| 部分消息 | `includePartialMessages` | `includePartialMessages` |
| 跳过权限 | `allowDangerouslySkipPermissions` | 无（通过 permissionMode: 'yolo' 实现） |
| 工具授权 | `canUseTool` | `canUseTool` |
| 模型配置 | 通过环境变量 | `model` 参数 |

### 1.3 主要差异

1. **可执行路径参数名**: `pathToClaudeCodeExecutable` -> `pathToQwenExecutable`
2. **会话恢复**: claude-agent-sdk 支持 `resume` 参数，qwen-code/sdk 暂无直接支持
3. **权限跳过**: `allowDangerouslySkipPermissions` 在 qwen-code/sdk 中通过 `permissionMode: 'yolo'` 实现
4. **标题生成**: `unstable_v2_prompt` 在 qwen-code/sdk 中不存在，需要自行实现

---

## 二、需要修改的文件

### 2.1 Electron 主进程文件

#### 文件 1: `src/electron/libs/runner.ts`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`
- `pathToClaudeCodeExecutable` 改为 `pathToQwenExecutable`
- 移除 `resume` 参数（或等待 qwen-code/sdk 支持）
- 将 `allowDangerouslySkipPermissions: true` + `permissionMode: "bypassPermissions"` 改为 `permissionMode: "yolo"`

```typescript
// 修改前
import { query, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import { query, type SDKMessage, type PermissionResult } from "@qwen-code/sdk";
```

```typescript
// 修改前
const q = query({
  prompt,
  options: {
    cwd: session.cwd ?? DEFAULT_CWD,
    resume: resumeSessionId,
    abortController,
    env: enhancedEnv,
    pathToClaudeCodeExecutable: claudeCodePath,
    permissionMode: "bypassPermissions",
    includePartialMessages: true,
    allowDangerouslySkipPermissions: true,
    canUseTool: async (toolName, input, { signal }) => { ... }
  }
});

// 修改后
const q = query({
  prompt,
  options: {
    cwd: session.cwd ?? DEFAULT_CWD,
    // resume: resumeSessionId, // qwen-code/sdk 暂不支持
    abortController,
    env: enhancedEnv,
    pathToQwenExecutable: qwenCodePath,
    permissionMode: "yolo",  // 替代 bypassPermissions + allowDangerouslySkipPermissions
    includePartialMessages: true,
    canUseTool: async (toolName, input, { signal }) => { ... }
  }
});
```

#### 文件 2: `src/electron/libs/util.ts`
**修改内容**:
- 移除 `unstable_v2_prompt` 导入
- 重写 `generateSessionTitle` 函数，使用普通 query 调用或简单的字符串处理
- 修改 `getClaudeCodePath` 为 `getQwenCodePath`，路径指向 `@qwen-code/sdk`

```typescript
// 修改前
import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import { query, type SDKResultMessage } from "@qwen-code/sdk";
```

```typescript
// 修改路径
export function getQwenCodePath(): string | undefined {
  if (app.isPackaged) {
    return join(
      process.resourcesPath,
      'app.asar.unpacked/node_modules/@qwen-code/sdk/cli.js'  // 需确认实际路径
    );
  }
  return undefined;
}
```

#### 文件 3: `src/electron/types.ts`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`
- 可选：调整 `ClaudeSettingsEnv` 类型名称和字段（如果需要对接 Qwen 的配置）

```typescript
// 修改前
import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import type { SDKMessage, PermissionResult } from "@qwen-code/sdk";
```

#### 文件 4: `src/electron/libs/claude-settings.ts`
**修改内容**:
- 可选：重命名为 `qwen-settings.ts`
- 调整环境变量键名以匹配 Qwen 的配置格式

```typescript
// 可能需要修改的环境变量键
const QWEN_SETTINGS_ENV_KEYS = [
  "OPENAI_API_KEY",        // 或 QWEN_API_KEY
  "OPENAI_BASE_URL",       // 或 QWEN_BASE_URL
  "OPENAI_MODEL",          // 或 QWEN_MODEL
  // ... 其他配置
] as const;
```

### 2.2 UI 前端文件

#### 文件 5: `src/ui/types.ts`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`

```typescript
// 修改前
import type { SDKMessage, PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import type { SDKMessage, PermissionResult } from "@qwen-code/sdk";
```

#### 文件 6: `src/ui/components/EventCard.tsx`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`

```typescript
// 修改前
import type {
  PermissionResult,
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage
} from "@anthropic-ai/claude-agent-sdk";

// 修改后
import type {
  PermissionResult,
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage
} from "@qwen-code/sdk";
```

#### 文件 7: `src/ui/components/DecisionPanel.tsx`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`

```typescript
// 修改前
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import type { PermissionResult } from "@qwen-code/sdk";
```

#### 文件 8: `src/ui/App.tsx`
**修改内容**:
- 导入语句从 `@anthropic-ai/claude-agent-sdk` 改为 `@qwen-code/sdk`

```typescript
// 修改前
import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";

// 修改后
import type { PermissionResult } from "@qwen-code/sdk";
```

### 2.3 配置文件

#### 文件 9: `electron-builder.json`
**修改内容**:
- `asarUnpack` 路径修改为 `@qwen-code/sdk`

```json
{
  "asarUnpack": [
    "node_modules/@qwen-code/sdk/**/*"
  ]
}
```

#### 文件 10: `package.json`
**修改内容**:
- 可选：移除 `@anthropic-ai/claude-agent-sdk` 依赖（迁移完成后）

---

## 三、特殊处理事项

### 3.1 会话恢复功能

当前 `runClaude` 函数使用 `resume: resumeSessionId` 来恢复会话。`@qwen-code/sdk` 暂不支持此功能，需要：

**方案 A**: 暂时移除会话恢复功能，等待 SDK 支持
**方案 B**: 通过维护消息历史，手动重放消息来模拟会话恢复

### 3.2 标题生成功能

`unstable_v2_prompt` 不存在于 `@qwen-code/sdk`，需要重新实现：

```typescript
// 方案：使用普通 query 调用
export const generateSessionTitle = async (userIntent: string | null) => {
  if (!userIntent) return "New Session";

  try {
    const q = query({
      prompt: `Please analyze the following user input and generate a short, clear title to identify this conversation theme:\n${userIntent}\n\nDirectly output the title only, do not include any other content.`,
      options: {
        pathToQwenExecutable: qwenCodePath,
        env: enhancedEnv,
        permissionMode: "yolo",
        maxSessionTurns: 1,
      }
    });

    for await (const message of q) {
      if (message.type === "result" && message.subtype === "success") {
        return message.result || "New Session";
      }
    }
  } catch {
    // 忽略错误
  }

  return "New Session";
};
```

### 3.3 环境变量配置

需要确认 Qwen 使用的环境变量格式：

| 用途 | Claude 环境变量 | Qwen 可能的环境变量 |
|------|----------------|-------------------|
| API 密钥 | `ANTHROPIC_AUTH_TOKEN` | `OPENAI_API_KEY` / `QWEN_API_KEY` |
| API 地址 | `ANTHROPIC_BASE_URL` | `OPENAI_BASE_URL` / `QWEN_BASE_URL` |
| 模型名称 | `ANTHROPIC_MODEL` | `OPENAI_MODEL` / `QWEN_MODEL` |

---

## 四、迁移步骤

### 步骤 1: 更新 Electron 主进程类型定义
- 修改 `src/electron/types.ts`

### 步骤 2: 更新核心运行时
- 修改 `src/electron/libs/runner.ts`
- 修改 `src/electron/libs/util.ts`
- 可选修改 `src/electron/libs/claude-settings.ts`

### 步骤 3: 更新 UI 类型和组件
- 修改 `src/ui/types.ts`
- 修改 `src/ui/App.tsx`
- 修改 `src/ui/components/EventCard.tsx`
- 修改 `src/ui/components/DecisionPanel.tsx`

### 步骤 4: 更新构建配置
- 修改 `electron-builder.json`

### 步骤 5: 验证和测试
- 运行 `bun run dev` 验证开发环境
- 测试会话创建、消息流、工具调用等核心功能

---

## 五、风险评估

| 风险 | 严重程度 | 缓解措施 |
|------|----------|----------|
| 会话恢复功能丢失 | 中 | 暂时禁用，后续迭代实现 |
| CLI 路径不正确 | 高 | 确认 @qwen-code/sdk 的 CLI 入口文件 |
| 类型不完全兼容 | 低 | 两个 SDK 类型高度相似 |
| 环境变量不匹配 | 中 | 需确认 Qwen 的配置格式 |

---

## 六、待确认事项

1. `@qwen-code/sdk` 打包后的 CLI 入口文件路径是什么？
2. Qwen 使用的环境变量格式是否与 OpenAI 兼容？
3. 是否需要保留会话恢复功能？