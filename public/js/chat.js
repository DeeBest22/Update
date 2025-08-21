@@ .. @@
 // Socket event listeners
 socket.on('connect', () => {
     console.log('Connected to server');
     if (userName) {
         socket.emit('register', userName);
     }
 });
 
+// Listen for name updates from meeting
socket.on('nameUpdated', (data) => {
    if (data.newName && data.newName.trim()) {
        userName = data.newName.trim();
        socket.emit('register', userName);
        console.log('Chat name updated from meeting to:', userName);
        
        // Update any displayed user name in chat UI
        updateDisplayedUserName(userName);
    }
});

// Handle chat name updates
function updateChatName(newName) {
    if (newName && newName.trim()) {
        userName = newName.trim();
        socket.emit('register', userName);
        console.log('Chat name updated to:', userName);
        updateDisplayedUserName(userName);
    }
}

// Update displayed user name in chat interface
function updateDisplayedUserName(name) {
    // Update any elements that show the current user's name
    const userNameElements = document.querySelectorAll('.current-user-name');
    userNameElements.forEach(element => {
        element.textContent = name;
    });
}

// Make function globally available
window.updateChatName = updateChatName;

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