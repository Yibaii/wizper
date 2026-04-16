import { keccak256, toBytes, encodePacked } from 'viem';

/**
 * ZK Commitment Scheme 工具
 *
 * 流程:
 *   1. generateNullifier() — 生成随机秘密
 *   2. createCommitment() — 计算 commitment hash
 *   3. 将 commitment 提交到链上
 *   4. 将 nullifier 保存到 localStorage (用户的秘密)
 *   5. 之后可以用 nullifier 证明所有权
 */

// 生成随机 nullifier (32 bytes)
export function generateNullifier(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

// 计算 commitment = keccak256(expressionHash, nullifier, author)
export function createCommitment(
  expressionHash: `0x${string}`,
  nullifier: `0x${string}`,
  author: `0x${string}`,
): `0x${string}` {
  return keccak256(encodePacked(
    ['bytes32', 'bytes32', 'address'],
    [expressionHash, nullifier, author],
  ));
}

// 计算 expression 文本的 hash
export function hashExpression(text: string): `0x${string}` {
  return keccak256(toBytes(text));
}

// ── localStorage 管理 ──────────────────────────────

const STORAGE_KEY = 'wizper_zk_nullifiers';

interface NullifierRecord {
  expressionId: string;
  expressionHash: `0x${string}`;
  nullifier: `0x${string}`;
  commitment: `0x${string}`;
  createdAt: string;
}

export function saveNullifier(record: NullifierRecord): void {
  const records = getNullifiers();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getNullifiers(): NullifierRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getNullifierForExpression(expressionId: string): NullifierRecord | undefined {
  return getNullifiers().find(r => r.expressionId === expressionId);
}
