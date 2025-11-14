# Local CSS IntelliSense

✨ IntelliSense for local CSS classes used in React/Next.js components via `styleName` prop. Works with JavaScript (`.js`, `.jsx`) and TypeScript (`.ts`, `.tsx`) files.

## ✨ Features

• 🔤 **Autocomplete** - Smart suggestions for CSS class names when typing `styleName="`  
• 👁️ **Hover Info** - View CSS properties by hovering over class names  
• 🎯 **Go to Definition** - Navigate to CSS definitions with Ctrl+Click (Cmd+Click on macOS)  
• 🔄 **Real-time Updates** - Automatically detects CSS file changes  
• ⚠️ **Diagnostics** - Warns about non-existent CSS classes  

## 🚀 Quick Start

1. **Import CSS files** in your component:
   ```typescript
   import './styles.css';
   ```

2. **Use `styleName` prop** in JSX:
   ```tsx
   <div styleName="container">
     <p styleName="text-primary">Hello World</p>
   </div>
   ```

3. **Type `styleName="`** → See autocomplete suggestions  
4. **Hover** over class names → View CSS properties  
5. **Ctrl+Click** (Cmd+Click on macOS) → Navigate to definition  

## 📋 Requirements

• VS Code 1.74.0 or higher  
• React/Next.js projects  
• JavaScript (`.js`, `.jsx`) or TypeScript (`.ts`, `.tsx`) files with JSX  
• CSS files imported with relative paths (`import './styles.css'`)

## 🎹 Keyboard Shortcuts

• `Ctrl+Enter` (Windows/Linux) / `Cmd+Enter` (macOS) - Trigger CSS class completion

## ⚙️ Configuration

• 🎉 **Zero configuration** - Works out of the box!

## 📦 Supported Import Patterns

• ✅ Same-directory imports: `import './styles.css'`  
• ✅ Multiple CSS imports per component  

## ⚠️ Known Limitations

• Only same-directory CSS imports (`./filename.css`)  
• Parent directory imports (`../styles.css`) coming soon  
• Only string literals in `styleName` prop (no dynamic values)

## 📝 Release Notes

See the changelog in the VS Code Marketplace for version history and updates.

## 🤝 Contributing

Contributions welcome! Feel free to submit issues or pull requests.

## 📄 License

MIT License
