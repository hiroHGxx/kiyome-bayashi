
\new PianoStaff <<
  \time 3/8
  \new Staff = "up" {
    \tempo "Poco moto" 4=70
    \set Score.tempoHideNote = ##t
    \partial 8 e''16\pp dis''
    e'' dis'' e'' b' d'' c''
    a'8 r16 c' e' a'
    b'8 r16 e' gis' b'
    c''8 r16 e' e'' dis''
    e'' dis'' e'' b' d'' c''
  }

  \new Staff = "down" {
    \clef bass
    \set Staff.pedalSustainStyle = #'bracket
    \partial 8 r8
    R8*3
    a,16\pp\sustainOn e a r8.
    e,16\sustainOff\sustainOn e gis r8.
    a,16\sustainOff\sustainOn e a r8.
    R8*3\sustainOff
  }
>>
