import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme2} from '../utils/theme';

const Header = () => {
  return (
    <LinearGradient colors={themeReverse.gradient} style={styles.header}>
      <Text style={styles.title}>DomainFilms</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 30 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme2.textColor,
    textShadowColor: '#00000060',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default Header;
