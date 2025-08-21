@@ .. @@
 // Socket event listeners
 socket.on('connect', () => {
     console.log('Connected to server');
     if (userName) {
         socket.emit('register', userName);
     }
 });
 
+// Listen for name updates from meeting
+socket.on('updateUsers', (updatedUsers) => {
+    users = updatedUsers;
+    updateParticipantsList();
+});
+
+// Handle chat name updates
+function updateChatName(newName) {
+    if (newName && newName.trim()) {
+        userName = newName.trim();
+        socket.emit('register', userName);
+        console.log('Chat name updated to:', userName);
+    }
+}
+
+// Make function globally available
+window.updateChatName = updateChatName;
+
 socket.on('updateUsers', (updatedUsers) => {
     users = updatedUsers;
     updateParticipantsList();
 });