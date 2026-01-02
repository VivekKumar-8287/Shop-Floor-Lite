// hooks/useTheme.ts
export const useTheme = () => {
  const theme = {
    colors: {
      primary: '#007AFF',
      background: '#f5f5f5',
      text: '#333',
      // ... other colors
    },
    spacing: {
      small: 8,
      medium: 16,
      large: 24,
    },
  };
  
  return theme;
};