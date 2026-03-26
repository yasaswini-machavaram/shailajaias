---
description: how to apply styles from the predefined style guide
---

1.  **Read the Style Guide**: Before modifying any UI, read `apps/client/app/style.json`.
2.  **Identify Tokens**: Match the required design elements (colors, spacing, etc.) to the tokens in `style.json`.
3.  **Apply CSS Variables/Values**:
    - If the project uses CSS variables mapped to `style.json`, use those.
    - Otherwise, use the literal values (hex codes, pixel values) defined in the JSON.
4.  **Verify Components**: If creating a button, card, or input, ensure it matches the `components` section in `style.json`.
5.  **Check Layout**: Ensure vertical and horizontal padding follows the `layout` and `spacing` sections.
