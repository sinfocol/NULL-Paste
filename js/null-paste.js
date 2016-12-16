var global = {
    'paste' : '',
    'paste_url' : '',
    'hash_process' : true,
    'options' : 0
};

var paste_struct = {
    'id' : '',
    'iv' : '',
    'salt' : '',
    'content' : '',
    'password' : '',
    'creation' : '',
    'expiration' : '',
    'views' : 0
};

var options = {
    'none' : 0,
    'password' : 1,
    'file' : 2,
    'reserved1' : 4,
    'reserved2' : 8
};

window.onhashchange = function() {
    processHash();
};

$(document).ready(function() {
    hljs.initHighlightingOnLoad();
    hljs.configure({tabReplace: '    '});

    $.ajaxSetup({
        'type' : 'POST',
        'url' : 'index.php',
        'dataType' : 'json'
    });

    $('#paste_password').keypress(function(e){
        if (e.which === 13) {
            put();
        }
    });

    $('#password_input').keypress(function(e){
        if (e.which === 13) {
            processing(true);
            
            setTimeout(function() {
                paste_struct.password = $('#password_input').val();
                get_postprocess();
            }, 500);
        }
    });
    
    if (FlashDetect.installed) {
        var client = new ZeroClipboard($('#copy_link')[0]);
        client.on('ready', function(readyEvent) {
            $('#copy_link').show();
            client.on('aftercopy', function(event) {
                success('Clipboard', 'Content copied to clipboard successfully');
            });
            client.on('copy', function (event) {
                var clipboard = event.clipboardData;
                clipboard.setData('text/plain', global.paste);
                clipboard.setData('text/html', $('code#paste_content').html());
            });
        });
    }

    var dropZone = document.getElementById('drop_zone');
    if (window.File && window.FileList && window.FileReader &&
        (('draggable' in dropZone) || ('ondragstart' in dropZone && 'ondrop' in dropZone)) &&
        isMobile() === false)
    {

        $('#dropfile').show();

        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('dragleave', handleDragOver, false);
        dropZone.addEventListener('dragenter', handleDragOver, false);
        dropZone.addEventListener('drop', handleFileSelect, false);
    }

    $('a').click(actionHandler);

    processHash();
});

var actionHandler = function(event) {
    var link = event.target;
    
    if (link.href !== '') {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    switch (link.id) {
        case 'brand_link':
        case 'new_paste_link':
            $('.navbar-collapse.in').collapse('hide');
            new_paste();
            break;
        case 'save_link':
            put();
            break;
        case 'qrcode_generate_link':
            qrcode('qrcode_dialog');
            $('#qrdialog').modal('show');
            break;
        case 'download_link':
            download();
            break;
        case 'raw_link':
            raw();
            break;
        case 'auto_generate':
            var generated_password = sjcl.codec.base64.fromBits(sjcl.random.randomWords(12, 10), true, true)
            $('#paste_password').val(generated_password);
            modal('Generated password', generated_password, 'success');
            
            $('#postdialog').on('shown.bs.modal', function (e) {
                $('#postdetail').focus().select();
            });
            break;
        case 'stats':
            $('.navbar-collapse.in').collapse('hide');
            stats();
            break;
        case 'about':
            $('.navbar-collapse.in').collapse('hide');
            $('#paste_diagram').attr({'src' : 'img/NULLPaste_Diagram.png'});
            $('#aboutdialog').modal('show');
            break;
        case 'decrypt_paste':
            processing(true);
            
            setTimeout(function() {
                paste_struct.password = $('#password_input').val();
                get_postprocess();
            }, 500);
            break;
    }
};

var clear = function() {
    global.hash_process = true;

    $('#old_paste').hide();
    $('#old_paste_panel').hide();
    $('#new_paste').hide();
    $('#new_paste_panel').hide();
    $('#password_paste').hide();
    $('#postdialog').modal('hide');

    $('code#paste_content').text('');

    $('#new_paste>#paste_content').val('');
    $('#paste_expiration option').removeAttr('selected').filter('[value=1d]').prop('selected', true);
    $('#paste_burn').attr('checked', false);
    $('#paste_password').val('');

    $('#postdialog').off('shown.bs.modal');
    $('#postdialog').off('hidden.bs.modal');
};

var clear_hash = function() {
    global.hash_process = true;

    var loc = window.location;
    if ('pushState' in history) {
        history.pushState('', document.title, loc.pathname + loc.search);
        processHash();
    } else {
        loc.hash = '';
    }
};

var new_paste = function() {
    clear_hash();
    processHash();
};

var processHash = function() {
    if (!global.hash_process) {
        return;
    }

    clear();

    if (window.location.hash.length === 58) {
        $('#old_paste').show();
        $('#old_paste_panel').show();

        global.paste_url = window.location.href;

        get();
    } else {
        sjcl.random.startCollectors();

        $('#new_paste').show();
        $('#new_paste_panel').show();
        $('#new_paste>#paste_content').focus();
    }
};

var modal = function(title, content, status) {
    $('#qrcode_status').html('');

    if (status === 'success') {
        $('#poststatus').addClass('label-success');
        $('#poststatus').removeClass('label-danger');
    } else if (status === 'error') {
        $('#poststatus').addClass('label-danger');
        $('#poststatus').removeClass('label-success');
    }

    $('#poststatus').text(title);
    $('#postdetail').val(content);

    $('#postdialog').modal('show');
};

var error = function(title, content) {
    modal(title, content, 'error');
};

var success = function(title, content) {
    modal(title, content, 'success');
};

var processing = function(status) {
    if (status) {
        $('#waitdialog').modal('show');
    } else {
        $('#waitdialog').modal('hide');
    }
};

var handleFileSelect = function(evt) {
    handleDragOver(evt);

    var files = evt.target.files || evt.dataTransfer.files;
    var file = files[0];

    if (file) {
        if (file.size === 0 || file.size > 65535) {
            error('Error, file size', 'File size must be greater than 0 bytes and less than 65535 bytes');
            return;
        }

        var reader = new window.FileReader();
        reader.onload = function(e) {
            $('#new_paste>#paste_content').val(reader.result);
        };

        reader.readAsText(file);
    } else {
        error('Error, unknown', 'Failed to load file');
        return;
    }
};

var handleDragOver = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
    evt.target.className = (evt.type === 'dragover' ? 'hover' : '');

    return false;
};

var isMobile = function() {
    var check = false;
    (function(a) {if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;})(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};

var date_format = function(date) {
    var input;
    
    if (date instanceof Date) {
        input = date;
    } else {
        input = new Date(date);
    }
    
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    var year = input.getFullYear();
    var month = months[input.getMonth()];
    var day = input.getDate();
    if (day < 10) day = '0' + day;
    
    var output = month + ' ' + day + ' ' + year + ' - ' + input.toLocaleTimeString();
    
    return output;
};

var encrypt = function(content, password, salt, iv) {
    var key = sjcl.misc.pbkdf2(password, salt, 65535, 256);
    var aes = new sjcl.cipher.aes(key);

    return sjcl.mode.gcm.encrypt(aes, content, iv, [], 128);
};

var decrypt = function(content, password, salt, iv) {
    var key = sjcl.misc.pbkdf2(password, salt, 65535, 256);
    var aes = new sjcl.cipher.aes(key);

    try {
        return sjcl.mode.gcm.decrypt(aes, content, iv, [], 128);
    } catch (err) {
        return false;
    }
};

var stats = function() {
    processing(true);
    
    $.ajax({
        data: {
            'paste_option' : 'stats'
        },
        success: function(data) {
            processing(false);
            
            if (data.result) {
                $('#stats_pastes').text(data.result.pastes);
                $('#stats_sizes').text(data.result.sizes);
                $('#stats_views').text(data.result.views);
                $('#stats_expirations').text(data.result.expirations);
                $('#stats_burns').text(data.result.burns);
                
                $('#statsdialog').modal('show');
            } else {
                error('Error, statistics could not be retrieved', data.error_description);
            }
        },
        error: function() {
            processing(false);

            error('Error, statistics could not be retrieved', 'Error while retrieving data from server');
        }
    });
};

var get = function() {
    processing(true);
    setTimeout(get_preprocess, 500);
};

var get_preprocess = function() {
    var hash = window.location.hash;
    global.options = parseInt(hash.substring(57, 58));

    paste_struct.id = hash.substring(2, 13);
    paste_struct.iv = sjcl.codec.base64.toBits(hash.substring(13, 35));
    paste_struct.salt = sjcl.codec.base64.toBits(hash.substring(35, 57));

    $.ajax({
        data: {
            'paste_option' : 'get',
            'paste_id' : paste_struct.id
        },
        success: function(data) {
            if (data.result) {
                // content is equal to encrypted paste
                paste_struct.content = data.result.content;
                paste_struct.creation = data.result.creation;
                paste_struct.expiration = data.result.expiration;
                paste_struct.views = data.result.views;

                // PBKDF2
                paste_struct.password = '';
                if ((global.options & options.password) === 0) {
                    paste_struct.password = paste_struct.salt;

                    get_postprocess();

                    processing(false);
                } else if (global.options & options.password) {
                    processing(false);

                    $('#old_paste').hide();
                    $('#password_paste').show();
                    $('#password_input').focus();
                }
            } else {
                processing(false);

                error('Error, encrypted paste could not be retrieved', data.error_description);

                $('#postdialog').on('hidden.bs.modal', function (e) {
                    clear_hash();
                });
            }
        },
        error: function() {
            processing(false);

            error('Error, encrypted paste could not be retrieved', 'Error while retrieving data from server');

            $('#postdialog').on('hidden.bs.modal', function (e) {
                clear_hash();
            });
        }
    });
};

var get_postprocess = function() {
    processing(true);
    var decrypted_paste = decrypt(sjcl.codec.base64.toBits(paste_struct.content), paste_struct.password, paste_struct.salt, paste_struct.iv);

    if (decrypted_paste === false) {
        processing(false);

        error('Error, corrupted data', 'Encrypted data was modified or supplied password is incorrect');

        if ((global.options & options.password) === 0) {
            $('#postdialog').on('hidden.bs.modal', function (e) {
                clear_hash();
            });
        } else if (global.options & options.password) {
            $('#postdialog').on('hidden.bs.modal', function (e) {
                $('#password_input').val('');
                $('#password_input').focus();
            });
        }
        return;
    }

    if (global.options & options.password) {
        $('#old_paste').show();
        $('#password_paste').hide();
    }

    global.paste = unescape(RawDeflate.inflate(sjcl.codec.utf8String.fromBits(decrypted_paste)));
    
    $('#paste_creation').text(date_format(paste_struct.creation));
    $('#paste_expires').text(date_format(paste_struct.expiration));
    $('#paste_views').text(paste_struct.views);
    $('code#paste_content').text(global.paste);
    $('code#paste_content').each(function(i, block) {
        hljs.highlightBlock(block);
    });

    processing(false);
};

var put = function() {
    processing(true);
    setTimeout(put_preprocess, 500);
};

var put_preprocess = function() {
    // content of the paste
    global.paste = $('#new_paste>#paste_content').val();

    if (global.paste.length === 0) {
        processing(false);

        error('Error, paste length', 'Paste content can not be empty');
        return;
    }

    // compress
    var paste_content = RawDeflate.deflate(escape(global.paste));

    // get bits from compressed content
    paste_content = sjcl.codec.utf8String.toBits(paste_content);

    // random ID
    var id = sjcl.random.randomWords(2, 10);

    // PBKDF2
    var password = $('#paste_password').val();
    var salt = sjcl.random.randomWords(4, 10);
    var iv = sjcl.random.randomWords(4, 10);

    var options_result = options.none;

    // if no password is used, then password is salt
    if (password === '') {
        password = salt;
    } else {
        options_result |= options.password;
    }

    // encrypt paste
    encrypted_paste = encrypt(paste_content, password, salt, iv);

    if (encrypted_paste.length > 65535) {
        processing(false);

        error('Error, encrypted paste could not be saved', 'Paste content can not exceed the size limit of 65535 bytes');
        return;
    }

    // build the url (/ separator 1 byte + id 8 bytes + iv 16 bytes + adata 0 bytes + salt 16 bytes + password used 1 byte)
    var hash = '/' +
               sjcl.codec.base64.fromBits(id, true) +
               sjcl.codec.base64.fromBits(iv, true) +
               //sjcl.codec.base64.fromBits(adata, true) + '_' +
               sjcl.codec.base64.fromBits(salt, true) +
               options_result;

    global.paste_url = window.location.href.split("#")[0] + '#' + hash;
    
    var expiration = $('#paste_expiration').val();

    $.ajax({
        data: {
            'paste_option' : 'put',
            'paste_id' : sjcl.codec.base64.fromBits(id, true),
            'paste_content' : sjcl.codec.base64.fromBits(encrypted_paste),
            'paste_expiration' : expiration,
            'paste_burn' : $('#paste_burn').prop('checked')
        },
        success: function(data) {
            if (data.result && data.result === 'OK') {
                // clear data
                clear();
                
                $('#paste_creation').text(date_format(new Date()));
                $('#paste_expires').text(expiration);
                $('#paste_views').text(0);

                $('code#paste_content').text(global.paste);
                // hljs.initHighlighting();
                $('code#paste_content').each(function(i, block) {
                    hljs.highlightBlock(block);
                });

                $('#old_paste').show();
                $('#old_paste_panel').show();

                success('Encrypted paste successfully saved', global.paste_url);
                qrcode('qrcode_status');

                global.hash_process = false;
                window.location.hash = hash;
                
                $('#postdialog').on('shown.bs.modal', function (e) {
                    $('#postdetail').focus().select();
                });
            } else {
                error('Error, encrypted paste could not be saved', data.error_description);
            }

            processing(false);
        },
        error: function() {
            processing(false);

            error('Error, encrypted paste could not be saved', 'Error while retrieving data from server');
        }
    });
};

var qrcode = function(id) {
    $('#' + id).html('');

    new QRCode($('#' + id)[0], {
        text: global.paste_url,
        width: 256,
        height: 256,
        colorDark : '#000000',
        colorLight : '#ffffff'
    });
};

var download = function() {
    var blob = new Blob([global.paste], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, 'paste-' + (Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000) + '.txt');
};

var raw = function() {
    var w = window.open();
    var b = w.document.body;

    $(b).text(global.paste);
    $(b).html('<pre>' + $(b).html() + '</pre>');
};