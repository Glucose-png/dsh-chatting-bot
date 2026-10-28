const QR=require('qrcode');
QR.toFile('E:/dsh_chatting_bot/bili/state/qr.png', process.argv[2], {width:520, margin:2, errorCorrectionLevel:'M'})
  .then(()=>console.log('OK')).catch(e=>{console.error('ERR',e.message);process.exit(1)});
