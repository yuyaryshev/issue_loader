Ётот файл не работает. Ќе используйте его.
Ќе удал€ю его только потому что когда-то может потребоватьс€ снова попытатьс€ настраивать Mocha, 
- чтобы в этом случае не начинать с чистого листа


@rem npm run build_cov2
@cls
rmdir cov_out\\src /s /q
rmdir .nyc_output /s /q
rmdir coverage /s /q
mkdir cov_out
mkdir cov_out\src

babel src --config-file ./babel.cov.config.js --out-dir cov_out/src --extensions ".ts,.tsx" --source-maps inline
@rem mocha --config=.mocharc.cov.js
@rem nyc --reporter=lcov --reporter=text-summary --instrument=false --clean --exclude=false mocha --config=.mocharc.cov.js

nyc --reporter=lcov --reporter=text-summary --instrument=false --clean --exclude-after-remap=false --exclude=false yya_mocha_run.js 
nyc --reporter=lcov --reporter=text-summary --instrument=false --clean --exclude-after-remap=false --exclude=false mocha --config=.mocharc.cov.js