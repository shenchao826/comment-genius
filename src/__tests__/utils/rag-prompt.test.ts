import { describe, it, expect } from 'vitest';

// ===== 从 packages/rag-service 提取的 prompt 构建函数 =====

function buildTeacherPrompt(
  _query: string,
  context: Record<string, unknown>,
  chunks: Array<{ content: string; score?: number }>,
): string {
  const studentInfo = context.studentInfo as {
    name?: string;
    traits?: string[];
    commentType?: string;
    toneStyle?: string;
  } | undefined;

  const name = studentInfo?.name || '\u8be5\u751f';
  const traits = studentInfo?.traits || [];
  const commentTypeMap: Record<string, string> = {
    summary: '\u671f\u672b\u603b\u7ed3',
    encouragement: '\u65e5\u5e38\u9f13\u52b1',
    improvement: '\u6539\u8fdb\u5efa\u8bae',
    parent: '\u5bb6\u957f\u6c9f\u901a',
  };
  const toneMap: Record<string, string> = {
    formal: '\u6b63\u5f0f\u4eb2\u5207',
    warm: '\u6e29\u6696\u9f13\u52b1',
    objective: '\u5ba2\u89c2\u4e2d\u7acb',
  };

  const typeDesc = commentTypeMap[studentInfo?.commentType || 'summary'] || '\u671f\u672b\u603b\u7ed3';
  const toneDesc = toneMap[studentInfo?.toneStyle || 'formal'] || '\u6b63\u5f0f\u4eb2\u5207';

  const traitLabels = traits.join('\u3001');

  const kbContext = chunks.length > 0
    ? `\n\n\u3010\u53c2\u8003\u4f18\u79c0\u8bc4\u8bed\u8303\u4f8b\u3011\n${chunks.map((c) => c.content).join('\n---\n')}\n\n\u8bf7\u53c2\u8003\u4ee5\u4e0a\u8303\u4f8b\u7684\u98ce\u683c\u548c\u5199\u6cd5\uff0c\u4f46\u4e0d\u8981\u76f4\u63a5\u590d\u5236\u3002`
    : '';

  return `\u4f60\u662f\u4e00\u4f4d\u62e5\u670915\u5e74\u6559\u5b66\u7ecf\u9a8c\u7684\u8d44\u6df1\u6559\u5e08\uff0c\u64c5\u957f\u64b0\u5199\u6e29\u6696\u800c\u6709\u6d1e\u5bdf\u529b\u7684\u5b66\u751f\u8bc4\u8bed\u3002\n\n\u3010\u4efb\u52a1\u3011\u4e3a\u4ee5\u4e0b\u5b66\u751f\u64b0\u5199\u4e00\u6761${typeDesc}\u98ce\u683c\u7684\u8bc4\u8bed\n\n\u3010\u5b66\u751f\u59d3\u540d\u3011${name}\n${traitLabels ? `\u3010\u5b66\u751f\u7279\u70b9\u3011${traitLabels}` : ''}\u3010\u8bed\u6c14\u8981\u6c42\u3011${toneDesc}\n\n\u3010\u5199\u4f5c\u539f\u5219\u3011\n1. \u5177\u4f53\u800c\u4e0d\u7a7a\u6cdb\u2014\u2014\u63cf\u8ff0\u5177\u4f53\u884c\u4e3a\u800c\u975e\u5957\u8bdd\uff08\u907f\u514d"\u5b66\u4e60\u8ba4\u771f"\u201c\u56e2\u7ed3\u540c\u5b66"\u7b49\u7a7a\u6d1e\u8868\u8ff0\uff09\n2. \u81f3\u5c11\u63d0\u52302\u4e2a\u5177\u4f53\u7684\u573a\u666f\u6216\u884c\u4e3a\u7ec6\u8282\n3. \u7ed3\u5c3e\u7ed9\u4e88\u6e29\u6696\u7684\u671f\u671b\u6216\u5efa\u8bae\n4. \u5b57\u6570\u63a7\u5236\u5728100-300\u5b57\n5. \u76f4\u63a5\u8f93\u51fa\u8bc4\u8bed\u6b63\u6587\uff0c\u4e0d\u52a0\u6807\u9898\u6216\u524d\u7f00${kbContext}`;
}

function buildRagPrompt(
  productLine: string,
  userQuery: string,
  context: Record<string, unknown>,
  retrievedChunks: Array<{ content: string; score?: number }>,
): string {
  if (productLine === 'teachers') {
    return buildTeacherPrompt(userQuery, context, retrievedChunks);
  }

  const kbText = retrievedChunks
    .map((c, i) => `\u3010\u53c2\u8003\u8d44\u6599${i + 1}\u3011\n${c.content}`)
    .join('\n\n');

  return `${userQuery}\n\n${kbText ? `\u8bf7\u53c2\u8003\u4ee5\u4e0b\u8d44\u6599\u8fdb\u884c\u56de\u7b54\uff1a\n${kbText}` : ''}`;
}

// ===== 测试用例 =====

describe('buildTeacherPrompt - 教师评语 Prompt 构建', () => {

  describe('基础结构', () => {
    it('应包含教师角色描述', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('15\u5e74\u6559\u5b66\u7ecf\u9a8c');
      expect(prompt).toContain('\u8d44\u6df1\u6559\u5e08');
    });

    it('应包含任务描述', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('\u3010\u4efb\u52a1\u3011');
    });

    it('应包含写作原则', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('\u3010\u5199\u4f5c\u539f\u5219\u3011');
      expect(prompt).toContain('\u5177\u4f53\u800c\u4e0d\u7a7a\u6cdb');
    });

    it('默认学生姓名应为"该生"', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('\u8be5\u751f');
    });
  });

  describe('学生信息注入', () => {
    it('应包含自定义学生姓名', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { name: '\u5f20\u4e09' }
      }, []);
      expect(prompt).toContain('\u5f20\u4e09');
      expect(prompt).not.toContain('\u8be5\u751f');
    });

    it('应包含学生特点', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { traits: ['\u5b66\u4e600\u1e91\u6b63', '\u79ef\u6781\u53d1\u8a00'] }
      }, []);
      expect(prompt).toContain('\u3010\u5b66\u751f\u7279\u70b9\u3011');
      expect(prompt).toContain('\u5b66\u4e600\u1e91\u6b63');
      expect(prompt).toContain('\u79ef\u6781\u53d1\u8a00');
    });

    it('多个特点应用顿号分隔', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { traits: ['A', 'B', 'C'] }
      }, []);
      // 特点之间应有顿号
      const traitSection = prompt.match(/\u3010\u5b66\u751f\u7279\u70b9\u3011(.*)/)?.[1] || '';
      expect(traitSection).toContain('A\u3001B\u3001C');
    });

    it('无特点时不应显示特点区域', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { traits: [] }
      }, []);
      expect(prompt).not.toContain('\u3010\u5b66\u751f\u7279\u70b9\u3011');
    });
  });

  describe('评语类型和语气', () => {
    it('默认类型应为期末总结', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('\u671f\u672b\u603b\u7ed3');
    });

    it('encouragement 类型应为日常鼓励', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { commentType: 'encouragement' }
      }, []);
      expect(prompt).toContain('\u65e5\u5e38\u9f13\u52b1');
    });

    it('improvement 类型应为改进建议', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { commentType: 'improvement' }
      }, []);
      expect(prompt).toContain('\u6539\u8fdb\u5efa\u8bae');
    });

    it('parent 类型应为家长沟通', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { commentType: 'parent' }
      }, []);
      expect(prompt).toContain('\u5bb6\u957f\u6c9f\u901a');
    });

    it('默认语气应为正式亲切', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).toContain('\u6b63\u5f0f\u4eb2\u5207');
    });

    it('warm 语气应为温暖鼓励', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { toneStyle: 'warm' }
      }, []);
      expect(prompt).toContain('\u6e29\u6696\u9f13\u52b1');
    });

    it('objective 语气应为客观中立', () => {
      const prompt = buildTeacherPrompt('test', {
        studentInfo: { toneStyle: 'objective' }
      }, []);
      expect(prompt).toContain('\u5ba2\u89c2\u4e2d\u7acb');
    });
  });

  describe('知识库上下文（RAG）', () => {
    it('有参考范例时应包含知识库内容', () => {
      const chunks = [
        { content: '\u793a\u4f8b\u8bc4\u8bed1\uff1a\u8be5\u751f\u5b66\u4e600\u1e91\u79ef\u6781' },
        { content: '\u793a\u4f8b\u8bc4\u8bed2\uff1a\u8be5\u751f\u601d\u7ef4\u6d3b\u8dc3' },
      ];
      const prompt = buildTeacherPrompt('test', {}, chunks);

      expect(prompt).toContain('\u3010\u53c2\u8003\u4f18\u79c0\u8bc4\u8bed\u8303\u4f8b\u3011');
      expect(prompt).toContain('\u793a\u4f8b\u8bc4\u8bed1');
      expect(prompt).toContain('\u793a\u4f8b\u8bc4\u8bed2');
    });

    it('参考范例间应以 --- 分隔', () => {
      const chunks = [
        { content: 'first' },
        { content: 'second' },
      ];
      const prompt = buildTeacherPrompt('test', {}, chunks);
      // chunks 间以换行符和 --- 分隔
      expect(prompt).toContain('first');
      expect(prompt).toContain('second');
      expect(prompt).toContain('---');
    });

    it('有参考范例时应提醒不要直接复制', () => {
      const chunks = [{ content: 'sample' }];
      const prompt = buildTeacherPrompt('test', {}, chunks);
      expect(prompt).toContain('\u4e0d\u8981\u76f4\u63a5\u590d\u5236');
    });

    it('无参考范例时不应显示知识库部分', () => {
      const prompt = buildTeacherPrompt('test', {}, []);
      expect(prompt).not.toContain('\u53c2\u8003\u4f18\u79c0\u8bc4\u8bed\u8303\u4f8b');
    });
  });

  describe('完整参数组合测试', () => {
    it('完整参数应生成包含所有信息的 prompt', () => {
      const prompt = buildTeacherPrompt('generate comment for Zhang San', {
        studentInfo: {
          name: '\u5f20\u4e09',
          traits: ['\u5b66\u4e600\u1e91\u7aef\u6b63', '\u4e50\u4e8e\u52a9\u4eba'],
          commentType: 'encouragement',
          toneStyle: 'warm',
        }
      }, [
        { content: '\u4f18\u79c0\u8bc4\u8bed\u8303\u4f8b\u5185\u5bb9' }
      ]);

      // 验证各部分
      expect(prompt).toContain('\u5f20\u4e09');
      expect(prompt).toContain('\u5b66\u4e600\u1e91\u7aef\u6b63');
      expect(prompt).toContain('\u4e50\u4e8e\u52a9\u4eba');
      expect(prompt).toContain('\u65e5\u5e38\u9f13\u52b1');
      expect(prompt).toContain('\u6e29\u6696\u9f13\u52b1');
      expect(prompt).toContain('\u4f18\u79c0\u8bc4\u8bed\u8303\u4f8b\u5185\u5bb9');
      expect(prompt).toContain('15\u5e74\u6559\u5b66\u7ecf\u9a8c');
    });
  });
});

describe('buildRagPrompt - RAG 通用 Prompt 构建', () => {
  it('teachers 产品线应使用教师评语模板', () => {
    const prompt = buildRagPrompt('teachers', 'query', {
      studentInfo: { name: '\u6d4b\u8bd5' }
    }, []);

    expect(prompt).toContain('15\u5e74\u6559\u5b66\u7ecf\u9a8c');
    expect(prompt).toContain('\u6d4b\u8bd5');
  });

  it('非 teachers 产品线应使用通用模板', () => {
    const prompt = buildRagPrompt('general', '\u4ec0\u4e48\u662fAI?', {}, [
      { content: 'AI\u662f\u4eba\u5de5\u667a\u80fd' }
    ]);

    expect(prompt).toContain('\u4ec0\u4e48\u662fAI?');
    expect(prompt).toContain('AI\u662f\u4eba\u5de5\u667a\u80fd');
    expect(prompt).toContain('\u53c2\u8003\u8d44\u6599');
  });

  it('非 teachers 产品线无参考资料时应只返回查询内容', () => {
    const prompt = buildRagPrompt('other', 'just a query', {}, []);
    // 无 chunks 时仍保留查询内容和尾部换行
    expect(prompt).toContain('just a query');
    expect(prompt.startsWith('just a query')).toBe(true);
  });

  it('多条参考资料应带编号', () => {
    const prompt = buildRagPrompt('general', 'Q', {}, [
      { content: 'ref1' },
      { content: 'ref2' },
      { content: 'ref3' },
    ]);

    expect(prompt).toContain('\u53c2\u8003\u8d44\u65991');
    expect(prompt).toContain('\u53c2\u8003\u8d44\u65992');
    expect(prompt).toContain('\u53c2\u8003\u8d44\u65993');
  });
});
