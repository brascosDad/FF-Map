// Area "blobs" shown at the furthest-out zoom in place of individual booth
// squares. Hand-drawn by Ernest in Figma (layers named `blob-*`) and pulled
// out of design/basemap.svg by scripts/extract-blobs.py -- do not hand-edit;
// change the shape in Figma, re-export, and re-run the script.
//
// MapCanvas still clips the two street markets to their own street band, so
// a blob drawn a touch wide can never spill onto the grass or across a kerb.
export const BLOBS = {
  cpd: [
    'M406 368H417A4 4 0 0 1 421 372V745A4 4 0 0 1 417 749H406A4 4 0 0 1 402 745V372A4 4 0 0 1 406 368Z',
  ],
  mcl: [
    'M429 781H899A4 4 0 0 1 903 785V796A4 4 0 0 1 899 800H429A4 4 0 0 1 425 796V785A4 4 0 0 1 429 781Z',
  ],
  spine: [
    'M822.481 344.131L856.434 358.039C858.425 358.855 859.421 361.078 858.682 363.098C841.719 409.45 808.52 501.525 798 517.5C787.406 533.587 698.485 621.554 655.927 669.265C654.537 670.824 652.212 671.03 650.544 669.773L620.64 647.243C618.711 645.789 618.478 642.994 620.171 641.271C664.691 595.993 750.01 510.959 758.5 496C768.691 478.045 801.802 392.584 817.152 346.577C817.888 344.373 820.33 343.25 822.481 344.131Z',
  ],
  food: [
    'M892.31 257.865L859.496 241.048C857.368 239.957 854.764 240.966 853.926 243.206L821.834 328.936C821.087 330.932 822.037 333.164 823.994 334.01L857.164 348.343C859.255 349.246 861.677 348.224 862.488 346.096L894.223 262.85C894.95 260.943 894.125 258.796 892.31 257.865Z',
  ],
};
