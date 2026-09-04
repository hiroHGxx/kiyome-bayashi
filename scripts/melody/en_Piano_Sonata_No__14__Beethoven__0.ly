
\unfoldRepeats
\new PianoStaff <<
  \new Staff = "right" \with {
    midiInstrument = "acoustic grand"
  } \relative c' { \set Score.tempoHideNote = ##t \tempo "Adagio sostenuto" 4 = 52
      \key cis \minor
      \time 2/2
      \stemNeutral
    \tuplet 3/2 { gis8^"Si deve suonare tutto questo pezzo delicatissimamente e senza sordino" cis e }
      \override TupletNumber.stencil = ##f
      \repeat unfold 7 { \tuplet 3/2 { gis,8[ cis e] } } |
    \tuplet 3/2 { a,8[( cis e] } \tuplet 3/2 { a, cis e) } \tuplet 3/2 { a,8[( d! fis] } \tuplet 3/2 { a, d fis) } |
    \tuplet 3/2 { gis,([ bis fis'] } \tuplet 3/2 { gis, cis e } \tuplet 3/2 { gis,[ cis dis!] } \tuplet 3/2 { fis, bis dis) } |
  }
  \new Staff = "left" \with {
    midiInstrument = "acoustic grand"
  } {
    \clef bass \relative c' {
      \override TextScript #'whiteout = ##t
      \key cis \minor
      \time 2/2
      <cis,, cis'>1^\markup \italic { sempre \dynamic pp e senza sordino } \noBreak
      <b b'> \noBreak
      <a a'>2 <fis fis'> \noBreak
      <gis gis'> <gis gis'> \noBreak
    }
  }
>>
\midi { }
