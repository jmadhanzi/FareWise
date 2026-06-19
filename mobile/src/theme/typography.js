import { Platform } from 'react-native';

const fontFamily = Platform.select({
  android: 'Roboto',
  ios: 'System',
  default: 'System'
});

export const typography = {
  h1: { fontSize: 32, fontWeight: '700', fontFamily, lineHeight: 40 },
  h2: { fontSize: 26, fontWeight: '700', fontFamily, lineHeight: 34 },
  h3: { fontSize: 22, fontWeight: '600', fontFamily, lineHeight: 28 },
  h4: { fontSize: 18, fontWeight: '600', fontFamily, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', fontFamily, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400', fontFamily, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', fontFamily, lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', fontFamily, letterSpacing: 0.5 },
  label: { fontSize: 13, fontWeight: '500', fontFamily, letterSpacing: 0.3 }
};
