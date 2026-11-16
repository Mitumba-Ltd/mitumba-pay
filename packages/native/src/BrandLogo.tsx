import { Image, StyleSheet } from 'react-native'
import { MITUMBA_PAY_LOGO_ASPECT, MITUMBA_PAY_LOGO_URI } from './logoAsset'

/** The Mitumba Pay logo at a given height, as the hosted checkout shows it. Decorative. */
export function BrandLogo({ height }: { height: number }) {
  return (
    <Image
      source={{ uri: MITUMBA_PAY_LOGO_URI }}
      style={[styles.logo, { height, width: Math.round(height * MITUMBA_PAY_LOGO_ASPECT) }]}
      resizeMode="contain"
      accessible={false}
      accessibilityIgnoresInvertColors
    />
  )
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'flex-start' },
})
