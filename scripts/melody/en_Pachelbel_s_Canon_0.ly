
\paper { paper-width = 220\mm tagline = ##f }
\layout { \context { \Staff      \override VerticalAxisGroup.default-staff-staff-spacing = #'(( 0 0 0 0)) }
          \context { \ChordNames \override VerticalAxisGroup.nonstaff-relatedstaff-spacing.padding = 0 }
          \context { \Lyrics     \override VerticalAxisGroup.nonstaff-relatedstaff-spacing.basic-distance = 0 }
}
global = { \key d \major \time 4/4 }
bn = \once \override Score.BarNumber.break-visibility = ##(#t #t #t)
blu = { \override NoteHead.color = #blue        \override Stem.color = #blue        \override Beam.color = #blue }
grn = { \override NoteHead.color = #darkgreen   \override Stem.color = #darkgreen   \override Beam.color = #darkgreen }
mag = { \override NoteHead.color = #darkmagenta \override Stem.color = #darkmagenta \override Beam.color = #darkmagenta }
red = { \override NoteHead.color = #red         \override Stem.color = #red         \override Beam.color = #red
        \override Script.color   = #red }
canonA = { \blu fis4 e d cis | b a b cis | }
canonB = { \grn d cis b a | g fis g e | }
canonC = { \mag d8 fis a g fis d fis e | d b d a' g b a g | }
ViolinI = \relative c'' {
  \global
  \set Staff.midiPanPosition = -1 \set midiInstrument = "violin" \set Staff.instrumentName = "Violin I"
  R1*2 | \bn \canonA \canonB \bn \canonC
  \red fis8 d e cis' d fis a a, \bn | b g a fis d [d' d8.\trill cis16] |
}
ViolinII = \relative c'' {
  \global
  \set Staff.midiPanPosition = -0.5 \set midiInstrument = "violin" \set Staff.instrumentName = "Violin II"
  R1*4 | \canonA \canonB \canonC
}
ViolinIII = \relative c'' {
  \global
  \set Staff.midiPanPosition = 0.5 \set midiInstrument = "violin" \set Staff.instrumentName = "Violin III"
  R1*6 | \canonA \canonB
}
kords = \chordmode { \set ChordNames.midiInstrument = "acoustic guitar (steel)"
  d,4 a, b,:min fis,:min | g, d, g, a, | \set noChordSymbol = "(...)" r4
}
Cello = \relative c {
  \global \clef bass
  \set Staff.midiPanPosition = 1 \set midiInstrument = "cello" \set Staff.instrumentName = "Cello"
  \repeat unfold 5 { d4 a b fis | g d g a | }
}

\score {
  <<
    \new Staff \with { \magnifyStaff #2/3 } \ViolinI
    \new Staff \with { \magnifyStaff #2/3 } \ViolinII
    \new Staff \with { \magnifyStaff #2/3 } \ViolinIII
    \new ChordNames \kords
    \new Staff \with { \magnifyStaff #2/3 } \Cello
    \new Lyrics
    \lyricmode { I V vi iii IV I IV V (...) }
  >>
  \layout {
    \context ChordNames { \override ChordName #'font-size = -1 }
    \context Lyrics { \override LyricText #'font-size = -1 }
  }
}
\score { << \ViolinI \\ \ViolinII \\ \ViolinIII \\ \kords \\ \Cello >>
  \midi { \tempo 4 = 56
    \context { \Score midiChannelMapping = #'instrument }
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
  }
}
