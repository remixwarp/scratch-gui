# 共享书包功能设计

## 1. 数据模型

### 1.1 共享书包实体
```javascript
{
  id: String,              // 共享书包唯一标识
  name: String,            // 书包名称
  creatorId: String,       // 创建者ID
  creatorName: String,     // 创建者名称
  createdAt: Number,       // 创建时间戳
  roomId: String,          // 关联的团队协作房间ID
  permissions: [           // 权限列表
    {
      userId: String,      // 用户ID
      username: String,    // 用户名
      role: String,        // 角色：'owner' | 'editor' | 'viewer'
      joinedAt: Number     // 加入时间戳
    }
  ],
  items: [                 // 书包内容
    {
      id: String,          // 项目ID
      type: String,        // 项目类型：'script' | 'sprite' | 'costume' | 'sound' | 'folder'
      name: String,        // 项目名称
      mime: String,        // MIME类型
      body: String,        // 内容（base64编码）
      thumbnail: String,   // 缩略图（base64编码）
      folderId: String,    // 所在文件夹ID
      addedBy: String,     // 添加者ID
      addedAt: Number      // 添加时间戳
    }
  ]
}
```

### 1.2 权限级别
- **owner**：拥有者，可管理所有权限和内容
- **editor**：编辑者，可添加、删除、编辑书包内容
- **viewer**：查看者，只能查看和使用书包内容

## 2. 核心功能

### 2.1 创建共享书包
- 团队协作房主可创建共享书包
- 设置书包名称和初始权限

### 2.2 邀请成员
- 房主可邀请团队成员加入共享书包
- 为每个成员设置权限级别

### 2.3 权限管理
- 房主可修改成员权限
- 房主可移除成员

### 2.4 书包内容管理
- 添加项目到共享书包
- 从共享书包移除项目
- 编辑书包项目信息
- 组织书包内容（文件夹）

### 2.5 内容同步
- 实时同步书包内容变更
- 冲突解决机制

### 2.6 访问控制
- 根据权限级别限制操作
- 确保只有授权用户可访问

## 3. 技术实现

### 3.1 API设计
- `createSharedBackpack(roomId, name, initialPermissions)`：创建共享书包
- `getSharedBackpack(backpackId)`：获取共享书包内容
- `updateSharedBackpack(backpackId, updates)`：更新共享书包信息
- `deleteSharedBackpack(backpackId)`：删除共享书包
- `addBackpackItem(backpackId, item)`：添加项目到共享书包
- `removeBackpackItem(backpackId, itemId)`：从共享书包移除项目
- `updateBackpackItem(backpackId, itemId, updates)`：更新书包项目
- `addMember(backpackId, userId, role)`：添加成员
- `removeMember(backpackId, userId)`：移除成员
- `updateMemberRole(backpackId, userId, role)`：更新成员角色

### 3.2 存储方案
- 利用现有的IndexedDB存储机制
- 为共享书包创建单独的存储区域
- 实现数据同步和冲突解决

### 3.3 集成到现有系统
- 与团队协作服务集成
- 利用现有的用户管理和权限控制
- 扩展现有书包API以支持共享功能

## 4. 用户界面

### 4.1 共享书包创建界面
- 书包名称输入
- 权限设置选项
- 成员选择器

### 4.2 共享书包管理界面
- 书包内容浏览
- 成员管理面板
- 权限编辑界面

### 4.3 书包项操作界面
- 共享状态标识
- 权限提示
- 协作编辑指示器

## 5. 安全考虑

### 5.1 数据安全
- 加密存储共享书包数据
- 安全的权限验证机制

### 5.2 隐私保护
- 严格的访问控制
- 操作审计日志

### 5.3 防滥用措施
- 速率限制
- 权限变更通知

## 6. 实现计划

1. 扩展现有书包API，添加共享功能
2. 实现共享书包存储和同步机制
3. 开发用户界面组件
4. 集成到团队协作系统
5. 测试和优化
