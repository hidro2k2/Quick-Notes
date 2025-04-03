document.addEventListener('DOMContentLoaded', function() {
    const saveNoteButton = document.getElementById('saveNote');
    const saveFileButton = document.getElementById('saveFile');
    const toggleNotesButton = document.getElementById('toggleNotes');
    const clearAllNotesButton = document.getElementById('clearAllNotes');
    const noteArea = document.getElementById('note');
    const notesContainer = document.getElementById('notesContainer');
    const searchBox = document.getElementById('searchBox');
    let allNotes = [];
    let showingAllNotes = false; // Track whether all notes are shown
    let editingNoteId = null; // Biến để theo dõi ghi chú đang chỉnh sửa

    // Load and display only the most recent 2 or 3 notes, but keep all for searching
    function loadAllNotes() {
        chrome.storage.local.get(null, function(items) {
            allNotes = Object.keys(items).map(key => ({ id: key, content: items[key] }))
                .sort((a, b) => b.id.localeCompare(a.id)); // Sort notes by key assuming keys are timestamps
            if (showingAllNotes) {
                displayNotes(allNotes); // Display all notes if in the "show all" mode
            } else {
                displayNotes(allNotes.slice(0, 3)); // Display only the last 3 notes by default
            }
        });
    }

    // Display notes in the notes container
    function displayNotes(notes) {
        if (notes.length === 0) {
            notesContainer.innerHTML = '<p>No notes found.</p>';
            return;
        }
        notesContainer.innerHTML = notes.map(note => `
            <div class="note" data-id="${note.id}">
                <span>${note.content}</span>
                <button class="editNote" data-id="${note.id}">Edit</button>
                <button class="deleteNote" data-id="${note.id}">Delete</button>
            </div>
        `).join('');
    }

    // Populate the text area with the content of the clicked note
    function handleNoteClick(event) {
        const noteElement = event.target;
        if (noteElement.classList.contains('note')) {
            const noteId = noteElement.getAttribute('data-id');
            const noteContent = allNotes.find(note => note.id === noteId).content;
            noteArea.value = noteContent; // Populate the note area with the note content
        }
    }

    // Search through all notes, not just the displayed ones
    function searchNotes() {
        const searchText = searchBox.value.toLowerCase();
        const notesToSearch = showingAllNotes ? allNotes : allNotes.slice(0, 3);
        const filteredNotes = notesToSearch.filter(note => note.content.toLowerCase().includes(searchText));
        displayNotes(filteredNotes);
    }

    // Show all notes
    toggleNotesButton.addEventListener('click', function() {
        showingAllNotes = !showingAllNotes; // Toggle state
        toggleNotesButton.textContent = showingAllNotes ? 'Show Recent Notes' : 'Show All Notes'; // Update button text
        displayNotes(showingAllNotes ? allNotes : allNotes.slice(0, 3)); // Display based on state
    });

    // Clear all notes
    clearAllNotesButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete all notes? This action cannot be undone.')) {
            chrome.storage.local.clear(function() {
                alert('All notes have been cleared!');
                allNotes = [];
                displayNotes([]);
            });
        }
    });

    loadAllNotes();

    // Event to save a note
    saveNoteButton.addEventListener('click', function() {
        const note = noteArea.value;

        if (editingNoteId) {
            // Chế độ chỉnh sửa
            chrome.storage.local.set({ [editingNoteId]: note }, function() {
                alert('Note updated!');
                editingNoteId = null; // Reset chế độ chỉnh sửa
                saveNoteButton.textContent = 'Save Note'; // Đổi lại nút
                noteArea.value = ''; // Xóa nội dung trong textarea
                loadAllNotes();
            });
        } else {
            // Chế độ thêm mới
            const noteId = `note_${new Date().getTime()}`;
            chrome.storage.local.set({ [noteId]: note }, function() {
                alert('Note saved!');
                noteArea.value = ''; // Xóa nội dung trong textarea
                loadAllNotes();
            });
        }
    });

    // Event to save a note to a file
    saveFileButton.addEventListener('click', function() {
        const note = noteArea.value;

        if (!note) {
            alert('Please enter some text in the note!');
            return;
        }

        const blob = new Blob([note], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'note.txt';  // Default filename
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    // Add event listener for clicking on notes
    notesContainer.addEventListener('click', handleNoteClick);

    // Add event listener for deleting notes
    notesContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('deleteNote')) {
            const noteId = event.target.getAttribute('data-id');
            chrome.storage.local.remove(noteId, function() {
                alert('Note deleted!');
                loadAllNotes(); // Cập nhật danh sách ghi chú
            });
        }
    });

    // Add event listener for editing notes
    notesContainer.addEventListener('click', function(event) {
        if (event.target.classList.contains('editNote')) {
            editingNoteId = event.target.getAttribute('data-id');
            const noteContent = allNotes.find(note => note.id === editingNoteId).content;
            noteArea.value = noteContent; // Hiển thị nội dung ghi chú trong textarea
            saveNoteButton.textContent = 'Update Note'; // Đổi nút "Save Note" thành "Update Note"
        }
    });

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    searchBox.addEventListener('keyup', debounce(function() {
        if (searchBox.value.trim().length > 0) {
            searchNotes();
        } else {
            displayNotes(showingAllNotes ? allNotes : allNotes.slice(0, 3));
        }
    }, 300)); // Delay 300ms
});
