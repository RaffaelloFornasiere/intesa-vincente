I need to create the italian TV show game "Intesa Vincente".
In this game, two contestants stand while a third sits between them, and the two standing players must take turns saying one word each to help the seated player guess a target word.
Each correct guess gives the team a point, and the game continues until the target word is guessed or the time runs out. Each wrong guess results in a point deduction for the team.
If the givers make mistakes (e.g. say two words instead of one, or repeat a word) it will result in a point deduction for the team as well.

The seated player can stop the game at any time to make a guess, and if they guess correctly, they score points for their team.


The game is played in person, with the support of a software application that manages the game flow and displays relevant information to each player.

The software will be simple:
- 4 clients:
  - 1 Word Guesser
  - 2 Word Givers
  - 1 Controller

the 2 Word Givers will see a screen with a target word and a timer. Also, they'll see a "Passo" button to skip the word if they can't think of a clue.
The Word guesser will only see the timer, and a "Stop" button to stop the game when they think they're able to guess the word.
At this point, the Word Guesser will see full screen 5s countdown, and he should say the word out loud before the countdown ends.

all the three players will see the number of word guessed correctly, words not guessed, and the total points.

The controller will see everything: 
- the target word
- the timer 
- a start button and a stop button 
- two buttons to increment or decrement the points of the team, the words guessed correctly, and the words not guessed.
- a button to reset the game.

# technical requirements
- 4 clients:
  - Word Guesser
  - 2 Word Givers
  - Controller
- 1 server
- FastAPI with room-based websockets for real-time communication
- Frontend with React for the user interface

The devices share an uuid to identify the game session.
The time clients are static, they change only when a message arrives. countdown included. if no message arrives, the time is not updated.

when a device connects, it sends its type (Word Guesser, Word Giver 1, Word Giver 2, Controller) and the uuid of the game session.
The UUID is provided by the controller. to get the UUID the controller must enter an API key. other users must enter the UUID to connect to the game session, but no API key is required.



