import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auntyChatReply, type LlmMessage } from '../lib/llm';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

export default function ChatScreen() {
  const navigation = useNavigation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 'w1',
      role: 'assistant',
      text: "Aiyyo mone/mole, studies okke alle? Marks entha? Life plans entha paranja?",
    },
  ]);
  const listRef = useRef<FlatList<Msg>>(null);

  const history: LlmMessage[] = useMemo(
    () =>
      msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    [msgs]
  );

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const uid = Date.now().toString();
    const nextMsgs = [...msgs, { id: uid, role: 'user', text }];
    setMsgs(nextMsgs);
    scrollToEnd();
    setLoading(true);
    try {
      const reply = await auntyChatReply(history, text);
      setMsgs((prev) => [...prev, { id: uid + '-r', role: 'assistant', text: reply.trim() }]);
    } catch (e) {
      setMsgs((prev) => [
        ...prev,
        {
          id: uid + '-e',
          role: 'assistant',
          text: "Aiyyo network poyi. Later try cheyyu, okay?",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [history, input, loading, msgs, scrollToEnd]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Omana aunty</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home' as never)}>
          <Text style={styles.headerAction}>Home</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.botText]}>
              {item.text}
            </Text>
          </View>
        )}
        onContentSizeChange={scrollToEnd}
      />

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type in Manglish…"
            placeholderTextColor="#9aa0a6"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={[styles.sendBtn, loading && { opacity: 0.6 }]} onPress={onSend} disabled={loading}>
            <Text style={styles.sendBtnText}>{loading ? '…' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomColor: '#eee',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerAction: { color: '#2563eb', fontWeight: '600' },
  listContent: { padding: 12 },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    marginVertical: 6,
    borderRadius: 14,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb' },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  userText: { color: 'white' },
  botText: { color: '#111827' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopColor: '#eee',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  sendBtn: { marginLeft: 8, backgroundColor: '#111827', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  sendBtnText: { color: 'white', fontWeight: '700' },
});