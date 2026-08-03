package com.sky.handler;

import com.sky.constant.MessageConstant;
import com.sky.exception.BaseException;
import com.sky.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器，处理项目中抛出的业务异常
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 捕获业务异常
     */
    @ExceptionHandler
    public Result exceptionHandler(BaseException ex) {
        log.error("异常信息：{}", ex.getMessage(), ex);
        return Result.error(ex.getMessage());
    }

    /**
     * 捕获SQL完整性约束异常（如唯一键冲突）
     */
    @ExceptionHandler
    public Result exceptionHandler(DuplicateKeyException ex) {
        log.warn("SQL完整性约束异常: {}", ex.getMessage());
        String message = ex.getMessage();
        if (message.contains("Duplicate entry")) {
            // Duplicate entry '12233' for key 'employee.idx_username'
            String[] split = message.split("'");
            String duplicateValue = split[1];       // 12233
            String msg = duplicateValue + MessageConstant.ALREADY_EXISTS;  // 12233已存在
            return Result.error(msg);
        }else{
            return Result.error(MessageConstant.UNKNOWN_ERROR);
        }

    }

    /**
     * 兜底：捕获所有未预见的异常，打印完整堆栈到控制台
     */
    @ExceptionHandler
    public Result exceptionHandler(Exception ex) {
        log.error("系统异常：", ex);
        return Result.error(MessageConstant.UNKNOWN_ERROR);
    }

}
