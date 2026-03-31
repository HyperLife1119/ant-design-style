import * as postcss from 'postcss';

export const RemoveRulePlugin = postcss.plugin('remove-rule', (options: { selector: string }) => {
  return (root: postcss.Root) => {
    root.walkRules((rule) => {
      if (rule.selector === options.selector) {
        rule.remove();
      }
    });
  };
});
