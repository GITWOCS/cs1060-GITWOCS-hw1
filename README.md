Le Chess Master

Contributors:
___________________________________________________________________________________________
| Name                      |  username  |  email                                         |
-------------------------------------------------------------------------------------------  
| Mohamed Salam Moumie N.   | GITWOCS    | mohamedsalam_moumientieche@college.harvard.edu |
| Jean Yves Gatwaza K.      | jGatwaza   | jgatwazakubwimana@college.harvard.edu          |
-------------------------------------------------------------------------------------------

We started the development on Bolt https://full-feature-chess-g-21ci.bolt.host and then exported
it to github https://github.com/GITWOCS/cs1060-GITWOCS-hw1.git before deploying it on netlify

Try it out on: https://lechessmaster.netlify.app/

While working on this game, we encountered several challenges:
- Finding an appropriate AI agent that will correctly play the game
- Ensuring that all the chess rules were respected at all times
- When Playing against the AI, the AI timer would never run down while the human's timer ran down. Addressing this issue brought up another issue where the AI will play so fast, regardless of its elo in such a way that each move will take less than 2 seconds so eventually, the AI would always win to time.
- Another major issue that arose was that when the human player chosed the black pieces, the AI will play against itself.
- In addition, we encountered issues with the position evaluation bar that predicts who might win the game based on the current board, issues with the ui among others but we were able to address most, if not all of the major issues identified throughout this project.

Working on this more complicated version and addressing all the issues that came up took us about 4 hours. 

For redundancy purposes, here is a link of the Google Drive containing the files for this game: https://drive.google.com/file/d/1S6rXYb8FtdypfgFGK7blZbYtNZ62JoyF/view?usp=sharing
