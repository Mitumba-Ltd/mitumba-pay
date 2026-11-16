import { Image, StyleSheet, View } from 'react-native'
import { MITUMBA_PAY_LOGO_ASPECT, MITUMBA_PAY_LOGO_URI } from './logoAsset'

const LOGO_HEIGHT = 28

/** The Mitumba Pay logo on a white badge, sized to sit beside the sheet's close button. */
export function BrandLogo() {
  return (
    <View style={styles.badge}>
      <Image
        source={{ uri: MITUMBA_PAY_LOGO_URI }}
        style={styles.logo}
        resizeMode="contain"
        accessible={false}
        accessibilityIgnoresInvertColors
      />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { height: LOGO_HEIGHT, width: Math.round(LOGO_HEIGHT * MITUMBA_PAY_LOGO_ASPECT) },
})
