
full inspection of extra props: should use a custom inspect function, and ignore stack/message properties

use ctrl-z to suspend process - go through logs - come back
ctrl-z + fg


If we pass:

--inspect / --pretty

if it finds JSON objects, it will log them with colors and stuff


this is just a test 1234


1,2,3,4,5 --> log levels
in regular mode, when user hits these keys, it changes the log level


-----------

have to remove first line from file, after file grows bigger than 5 million bytes or what not

shift + up/down = find next match



\u001b[Z  => shift+tab will find the most recent match, not the next match
it can find the most recent match by reading the file backwards


-----------

ctrl-p  and then s (stop)
you are reading from an older point than the latest


slice(0,400);  trim things to 400 chars max  - makes sure the beginning of a line makes it onto the screen.
give the user a uuid at the end of the string - they can look up the uuid in redis, if they really want to
see the remainder of the string.


tab \t should not starting tailing and then stop,
instead it should using scrollDown style functionality?

the reason for this is the line break -----[ctrl-t]------ is kinda ugly


tab is to find next match
shift+tab to find previous match

on linux, \u001b[Z is shift+tab