import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';

interface Props {
  visible: boolean;
}

const LoadingOverlay: React.FC<Props> = ({ visible }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1e88e5" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default LoadingOverlay;