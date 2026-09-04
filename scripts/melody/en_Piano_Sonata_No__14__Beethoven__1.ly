
\new PianoStaff <<
  \new Staff = "right" \with {
    midiInstrument = "acoustic grand"
  } \relative c'' { \set Score.tempoHideNote = ##t
    \tempo \markup {
     \column {
      \line { Allegretto. }
      \line \tiny { La prima parte senza repetizione. }
     }
    } 4 = 180
    \key des \major
    \numericTimeSignature
    \time 3/4
    \partial 4
    <aes des>4(\p
    <aes c>2 <g bes>4
    <aes ees'>)-. r <f des'>-.
    <aes c>-. r <g bes>-.
    aes-. r <des ges>(
    <des f>2 <c ees>4
    <des aes'>)-. r <bes ges'>-.
    <des f>-. r <c ees>-.
    des-. r
  }
  \new Staff = "left" \with {
    midiInstrument = "acoustic grand"
  } {
    \clef bass \relative c' {
      \key des \major
      \numericTimeSignature
      \time 3/4
      \partial 4
      \tempo "Allegretto."
      f4(
      ees2 des4
      c)-. r <des, bes'>-.
      <ees ees'>-. r <ees des'>-.
      <aes c>-.r \clef treble bes'(
      aes2 ges4
      f)-. r \clef bass <ges, ees'>-.
      <aes aes'>-. r <aes ges'>-.
      <des f>-. r
    }
  }
>>
\midi { }
